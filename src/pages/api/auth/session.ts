export default function handler(req, res) { 
  res.status(200).json({ 
    user: { id: "1", name: "Admin", email: "artbag.rayanapp@gmail.com", role: "admin" },
    expires: "2030-01-01T00:00:00.000Z" 
  }) 
}
