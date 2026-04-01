import { Router, type IRouter } from "express";

const router: IRouter = Router();

function generateMedicalId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "HPE-";
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) id += "-";
  }
  return id;
}

router.post("/hpe/apply", (req, res) => {
  const { name, dob, gender } = req.body ?? {};

  if (!name || !dob || !gender) {
    return res.status(400).json({ message: "name, dob, and gender are required." });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 45);

  res.status(201).json({
    tempMedicalId: generateMedicalId(),
    patientName: name,
    dob,
    gender,
    issuedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    validDays: 45,
  });
});

export default router;
