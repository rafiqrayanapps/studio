export const authOptions = { 
  providers: [], 
  callbacks: { 
    async signIn() { return true; }, 
    async session({ session }) { 
      session.user = { id: "1", name: "Admin", email: "artbag.rayanapp@gmail.com", role: "admin" }; 
      return session; 
    },
    async authorize() { 
      return { id: "1", name: "Admin", email: "artbag.rayanapp@gmail.com", role: "admin" }; 
    }
  },
  pages: { signIn: "/studio" }
}; export default authOptions;
