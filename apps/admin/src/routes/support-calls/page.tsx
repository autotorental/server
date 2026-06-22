import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge, Button, Container, Heading, Text, Table } from "@medusajs/ui"
import { Phone, ChatBubbleLeftRight } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client"
import { API } from "../../lib/api"

type IncomingCall = {
  id: string
  room_name: string
  client_name?: string | null
  client_phone?: string | null
  client_country?: string | null
  created_at: string
}

type CallLog = {
  id: string
  client_name?: string | null
  client_phone?: string | null
  client_country?: string | null
  status?: string | null
  direction?: string | null
  seller_name?: string | null
  vehicle_title?: string | null
  created_at: string
  recording_url?: string | null
}

const LIVEKIT_WS = "wss://livekit.autotorental.com"
const ANSWERED = new Set(["answered", "completed", "ended", "connected"])
const MISSED = new Set(["missed", "no_answer", "rejected", "declined", "unanswered"])

const flag = (cc?: string | null) => {
  const c = (cc || "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return "🌐"
  return String.fromCodePoint(...[...c].map((x) => 0x1f1e6 + x.charCodeAt(0) - 65))
}
const fmt = (iso: string) => { try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) } catch { return "—" } }
const statusBadge = (s?: string | null) => {
  const v = (s || "").toLowerCase()
  if (ANSWERED.has(v)) return <Badge color="green">Answered</Badge>
  if (MISSED.has(v)) return <Badge color="red">Missed</Badge>
  return <Badge color="grey">{s || "—"}</Badge>
}

const Kpi = ({ label, value, color }: { label: string; value: React.ReactNode; color: string }) => (
  <div className="relative overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base p-5 text-center">
    <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
    <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted">{label}</div>
    <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
  </div>
)

const SupportCallsPage = () => {
  const [active, setActive] = useState<{ id: string; room: string } | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [status, setStatus] = useState("")
  const roomRef = useRef<Room | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)

  const { data, refetch } = useQuery<{ calls: IncomingCall[] }>({
    queryKey: ["support-calls-incoming"],
    queryFn: async () => {
      const res = await fetch(`${API}/admin/support-calls/incoming`, { credentials: "include" })
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
    refetchInterval: active ? false : 4000,
  })

  const { data: history } = useQuery<{ calls: CallLog[]; count: number }>({
    queryKey: ["support-calls-history"],
    queryFn: async () => {
      const res = await fetch(`${API}/admin/calls?limit=100`, { credentials: "include" })
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
    refetchInterval: 15000,
  })

  const stats = useMemo(() => {
    const logs = history?.calls || []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let answered = 0, missed = 0, todayCount = 0
    for (const c of logs) {
      const v = (c.status || "").toLowerCase()
      if (ANSWERED.has(v)) answered++
      else if (MISSED.has(v)) missed++
      if (new Date(c.created_at) >= today) todayCount++
    }
    return { total: history?.count ?? logs.length, answered, missed, today: todayCount }
  }, [history])

  const cleanup = useCallback(async () => {
    const r = roomRef.current
    roomRef.current = null
    if (r) { try { await r.disconnect() } catch { /* ignore */ } }
    setActive(null); setStatus(""); void refetch()
  }, [refetch])

  useEffect(() => { return () => { void cleanup() } }, [cleanup])

  const answer = async (call: IncomingCall) => {
    setStatus("Connecting…")
    try {
      const res = await fetch(`${API}/admin/support-calls/${call.id}/answer`, { method: "POST", credentials: "include" })
      if (!res.ok) throw new Error("answer failed")
      const { token, room, serverUrl } = (await res.json()) as { token?: string; room?: string; serverUrl?: string }
      if (!token) throw new Error("no token")
      const lkRoom = new Room()
      roomRef.current = lkRoom
      lkRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) track.attach(remoteVideoRef.current)
        else if (track.kind === Track.Kind.Audio && remoteAudioRef.current) track.attach(remoteAudioRef.current)
      })
      lkRoom.on(RoomEvent.Disconnected, () => { void cleanup() })
      await lkRoom.connect(serverUrl || LIVEKIT_WS, token)
      await lkRoom.localParticipant.setMicrophoneEnabled(true)
      try {
        await lkRoom.localParticipant.setCameraEnabled(true)
        const camPub = lkRoom.localParticipant.getTrackPublication(Track.Source.Camera)
        if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current)
      } catch { /* camera optional */ }
      setActive({ id: call.id, room: room || call.room_name })
      setStatus("Connected")
    } catch {
      setStatus("Could not connect the call.")
      await cleanup()
    }
  }

  const calls = data?.calls ?? []
  const logs = history?.calls ?? []

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center rounded-xl text-white shrink-0" style={{ width: 44, height: 44, backgroundImage: "linear-gradient(135deg,#059669,#0ea5e9)" }}><Phone /></div>
          <div>
            <div className="flex items-center gap-2">
              <Heading>Support Center</Heading>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
            </div>
            <Text className="text-ui-fg-subtle" size="small">In-house calls &amp; chat — answer free WebRTC video/voice calls and live chats from customers. No 3CX, no third party.</Text>
          </div>
        </div>
        <a href="/dashboard/support-chat"><Button variant="secondary"><ChatBubbleLeftRight /> Open Live Chat</Button></a>
      </div>

      {/* KPIs */}
      <div className="px-6 py-5">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Calls today" value={stats.today} color="#0ea5e9" />
          <Kpi label="Answered" value={stats.answered} color="#059669" />
          <Kpi label="Missed" value={stats.missed} color="#dc2626" />
          <Kpi label="Total calls" value={stats.total} color="#7c3aed" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1rem", alignItems: "start" }} className="px-6 pb-6">
      <div>
      {/* Active call */}
      {active ? (
        <div className="flex flex-col gap-4 px-6 py-6">
          <Text size="small">{status}</Text>
          <div className="relative w-full max-w-xl overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16 / 9" }}>
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-contain" />
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position: "absolute", bottom: 8, right: 8, width: 120, borderRadius: 8 }} />
          </div>
          <audio ref={remoteAudioRef} autoPlay />
          <div><Button variant="danger" onClick={() => void cleanup()}>End call</Button></div>
        </div>
      ) : (
        <div className="px-6 py-4">
          <Text weight="plus" className="mb-2 block">📞 Incoming calls</Text>
          {calls.length === 0 ? (
            <Text className="text-ui-fg-subtle" size="small">No incoming calls right now — this checks every few seconds.</Text>
          ) : (
            <div className="flex flex-col gap-3">
              {calls.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-ui-border-base px-4 py-3 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <div>
                    <Text weight="plus">{flag(c.client_country)} {c.client_name || "Customer"}</Text>
                    <Text size="small" className="text-ui-fg-subtle">{[c.client_phone, c.client_country].filter(Boolean).join(" · ") || "Incoming support call"}</Text>
                  </div>
                  <Button onClick={() => void answer(c)}>Answer</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </div>
      {/* Call history (right) */}
      <div>
        <Text weight="plus" className="mb-3 block">🕑 Call history</Text>
        {logs.length === 0 ? (
          <Text className="text-ui-fg-subtle" size="small">No calls logged yet.</Text>
        ) : (
          <Table>
            <Table.Header><Table.Row>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Phone</Table.HeaderCell>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>When</Table.HeaderCell>
              <Table.HeaderCell>Recording</Table.HeaderCell>
            </Table.Row></Table.Header>
            <Table.Body>
              {logs.map((c) => (
                <Table.Row key={c.id}>
                  <Table.Cell className="font-medium">{flag(c.client_country)} {c.client_name || "Customer"}</Table.Cell>
                  <Table.Cell>{c.client_phone || "—"}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{c.seller_name || "—"}</Table.Cell>
                  <Table.Cell>{statusBadge(c.status)}</Table.Cell>
                  <Table.Cell className="text-ui-fg-muted">{fmt(c.created_at)}</Table.Cell>
                  <Table.Cell>
                    {c.recording_url ? (
                      playingId === c.id ? (
                        <audio controls autoPlay src={`${API}${c.recording_url}`} onEnded={() => setPlayingId(null)} style={{ height: 34, maxWidth: 240, verticalAlign: "middle" }} />
                      ) : (
                        <Button size="small" variant="secondary" onClick={() => setPlayingId(c.id)}>▶ Play</Button>
                      )
                    ) : "—"}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
      </div>
    </Container>
  )
}

export default SupportCallsPage

export const config: RouteConfig = {
  label: "Support Center",
  icon: Phone, rank: 42 }
