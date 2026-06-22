import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge } from "@medusajs/ui"
import { Users } from "@medusajs/icons"
import { API } from "../../lib/api"
import { TableCell } from "../../lib/table-cell"

export const config: RouteConfig = { label: "Followers", icon: Users, rank: 4 }

// Phone-based follows store a pseudo email like "phone+447577563300@phone.autotorental.com".
// Surface the actual number so the vendor can see who follows them.
const phoneFromEmail = (email?: string | null): string | null => {
  if (!email) return null
  const m = /^phone\+?([0-9]{6,15})@phone\./i.exec(email)
  return m ? `+${m[1]}` : null
}
const isPseudoEmail = (email?: string | null) =>
  !!email && /@phone\.autotorental\.com$/i.test(email)

const Page = () => {
  const [data, setData] = useState<any>({ followers: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/vendor/followers`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load followers (${r.status})`)
        return r.json()
      })
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || "Failed to load followers"))
      .finally(() => setLoading(false))
  }, [])

  const followers = data?.followers ?? []
  const count = data?.count ?? followers.length

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">👥 Your Followers</Heading>
          <Badge color="blue">{count} followers</Badge>
        </div>
        <Text className="text-ui-fg-subtle">Customers who follow your rental company get notified when you add new listings or promotions.</Text>
      </Container>
      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Joined</Table.HeaderCell>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Phone</Table.HeaderCell>
            <Table.HeaderCell>Notify by email</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><TableCell colSpan={5}>Loading…</TableCell></Table.Row>}
            {!loading && error && <Table.Row><TableCell colSpan={5} className="text-center py-8 text-ui-fg-error">{error}. Try refreshing.</TableCell></Table.Row>}
            {!loading && !error && followers.length === 0 && <Table.Row><TableCell colSpan={5} className="text-center py-8 text-ui-fg-muted">No followers yet</TableCell></Table.Row>}
            {!error && followers.map((f: any) => {
              const derivedPhone = f.follower_phone || phoneFromEmail(f.follower_email)
              const showEmail = f.follower_email && !isPseudoEmail(f.follower_email)
              return (
                <Table.Row key={f.id}>
                  <Table.Cell>{f.created_at ? new Date(f.created_at).toLocaleDateString() : "—"}</Table.Cell>
                  <Table.Cell>{f.follower_name || (derivedPhone ? "Phone follower" : "Anonymous")}</Table.Cell>
                  <Table.Cell>{showEmail ? f.follower_email : "—"}</Table.Cell>
                  <Table.Cell>{derivedPhone || "—"}</Table.Cell>
                  <Table.Cell>{f.notify_email ? <Badge color="green">Yes</Badge> : <Badge color="grey">No</Badge>}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
