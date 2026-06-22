import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
} from "livekit-server-sdk"

let client: EgressClient | null = null

function getClient(): EgressClient {
  if (client) return client
  const host = process.env.LIVEKIT_SERVER_URL || "http://127.0.0.1:7880"
  const key = process.env.LIVEKIT_API_KEY || ""
  const secret = process.env.LIVEKIT_API_SECRET || ""
  client = new EgressClient(host, key, secret)
  return client
}

// Records a call room as an audio-only OGG/Opus file (tiny footprint).
// Files land in the egress container's /out mount -> /opt/autorental/recordings.
// Returns the egress id + the filename stored, or null on failure.
export async function startCallRecording(
  roomName: string,
  callId: string
): Promise<{ egressId: string; file: string } | null> {
  try {
    const file = callId + ".ogg"
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.OGG,
      filepath: "/out/" + file,
    })
    const info = await getClient().startRoomCompositeEgress(
      roomName,
      { file: output },
      { audioOnly: true }
    )
    return { egressId: info.egressId, file }
  } catch (e: any) {
    console.warn("startCallRecording failed:", e?.message || e)
    return null
  }
}
