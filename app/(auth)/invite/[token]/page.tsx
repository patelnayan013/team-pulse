export default function InvitePage({
  params,
}: {
  params: { token: string }
}) {
  return (
    <div>
      <h1>Accept Invitation</h1>
      <p>Token: {params.token}</p>
    </div>
  )
}
