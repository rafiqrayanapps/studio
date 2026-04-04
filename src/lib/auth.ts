export const authOptions = { providers: [], callbacks: { async authorize() { return { id: "1", name: "Admin", email: "artbag.rayanapp@gmail.com" }; } } }; export default authOptions;
