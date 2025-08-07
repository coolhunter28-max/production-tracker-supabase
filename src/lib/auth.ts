import NextAuth from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
ECHO est  activado.
const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
})
ECHO est  activado.
export { handler as GET, handler as POST }
