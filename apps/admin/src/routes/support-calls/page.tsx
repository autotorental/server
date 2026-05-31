import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { Phone } from "@medusajs/icons"
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

const LIVEKIT_WS = "wss://livekit.autotorental.com"

const SupportCallsPage = () => {
  const [active, setActive] = useState<{ id: string; room: string } | null>(null)
  const [status, setStatus] = useState("")
  const roomRef = useRef<Room | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)

  const { data, refetch } = useQuery<{ calls: IncomingCall[] }>({
    queryKey: ["support-calls-incoming"],
    queryFn: async () => {
      const res = await fetch(`${API}/admin/support-calls/incoming`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
    refetchInterval: active ? false : 4000,
  })

  const cleanup = useCallback(async () => {
    const r = roomRef.current
    roomRef.current = null
    if (r) {
      try {
        await r.disconnect()
      } catch {
        // ignore
      }
    }
    setActive(null)
    setStatus("")
    void refetch()
  }, [refetch])

  useEffect(() => {
    return () => {
      void cleanup()
    }
  }, [cleanup])

  const answer = async (call: IncomingCall) => {
    setStatus("Connecting…")
    try {
      const res = await fetch(`${API}/admin/support-calls/${call.id}/answer`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("answer failed")
      const { token, room, serverUrl } = (await res.json()) as {
        token?: string
        room?: string
        serverUrl?: string
      }
      if (!token) throw new Error("no token")

      const lkRoom = new Room()
      roomRef.current = lkRoom

      lkRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current)
        } else if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
          track.attach(remoteAudioRef.current)
        }
      })
      lkRoom.on(RoomEvent.Disconnected, () => {
        void cleanup()
      })

      await lkRoom.connect(serverUrl || LIVEKIT_WS, token)
      await lkRoom.localParticipant.setMicrophoneEnabled(true)
      try {
        await lkRoom.localParticipant.setCameraEnabled(true)
        const camPub = lkRoom.localParticipant.getTrackPublication(Track.Source.Camera)
        if (camPub?.track && localVideoRef.current) {
          camPub.track.attach(localVideoRef.current)
        }
      } catch {
        // camera optional — audio is enough
      }

      setActive({ id: call.id, room: room || call.room_name })
      setStatus("Connected")
    } catch {
      setStatus("Could not connect the call.")
      await cleanup()
    }
  }

  const calls = data?.calls ?? []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Support Calls</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Answer free in-app WebRTC calls from customers.
          </Text>
        </div>
        {active ? <Badge color="green">In call</Badge> : null}
      </div>

      {active ? (
        <div className="flex flex-col gap-4 px-6 py-6">
          <Text size="small">{status}</Text>
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-lg bg-black"
            style={{ aspectRatio: "16 / 9" }}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                width: 120,
                borderRadius: 8,
              }}
            />
          </div>
          <audio ref={remoteAudioRef} autoPlay />
          <div>
            <Button variant="danger" onClick={() => void cleanup()}>
              End call
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-6 py-4">
          {calls.length === 0 ? (
            <Text className="text-ui-fg-subtle" size="small">
              No incoming calls right now. This page checks every few seconds.
            </Text>
          ) : (
            calls.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <Text weight="plus">{c.client_name || "Customer"}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {[c.client_phone, c.client_country].filter(Boolean).join(" · ") ||
                      "Incoming support call"}
                  </Text>
                </div>
                <Button onClick={() => void answer(c)}>Answer</Button>
              </div>
            ))
          )}
        </div>
      )}
    </Container>
  )
}

export default SupportCallsPage

export const config: RouteConfig = {
  label: "Support Calls",
  icon: Phone,
}
