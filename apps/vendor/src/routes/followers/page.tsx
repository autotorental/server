import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge } from "@medusajs/ui"
import { Users } from "@medusajs/icons"

export const config: RouteConfig = { label: "Followers", icon: Users, rank: 4 }

const API = "https://api.autotorental.com"
const Page = () => {
  const [data, setData] = useState<any>({ followers: [], count: 0 })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`${API}/vendor/followers`, { credentials: "include" })
      .then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])
  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">👥 Your Followers</Heading>
          <Badge color="blue">{data.count} followers</Badge>
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
            {loading && <Table.Row><Table.Cell colSpan={5}>Loading…</Table.Cell></Table.Row>}
            {!loading && data.followers.length === 0 && <Table.Row><Table.Cell colSpan={5} className="text-center py-8 text-ui-fg-muted">No followers yet</Table.Cell></Table.Row>}
            {data.followers.map((f: any) => (
              <Table.Row key={f.id}>
                <Table.Cell>{new Date(f.created_at).toLocaleDateString()}</Table.Cell>
                <Table.Cell>{f.follower_name || "Anonymous"}</Table.Cell>
                <Table.Cell>{f.follower_email || "—"}</Table.Cell>
                <Table.Cell>{f.follower_phone || "—"}</Table.Cell>
                <Table.Cell>{f.notify_email ? <Badge color="green">Yes</Badge> : <Badge color="grey">No</Badge>}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
