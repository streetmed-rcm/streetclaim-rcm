import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/encounters", (req, res) => {
  const { id, patientName, dateOfService, latitude, longitude, clinicalNote } = req.body ?? {};

  if (!patientName || !dateOfService || !clinicalNote) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  res.status(201).json({
    id: id ?? crypto.randomUUID(),
    patientName,
    dateOfService,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    clinicalNote,
    codes: ["Z59.0"],
    posCode: "27",
    createdAt: new Date().toISOString(),
  });
});

router.post("/encounters/sync", (req, res) => {
  const { encounterIds } = req.body ?? {};

  if (!Array.isArray(encounterIds) || encounterIds.length === 0) {
    return res.status(400).json({ message: "encounterIds array is required." });
  }

  const results = encounterIds.map((id: string) => ({
    id,
    status: "synced",
    syncedAt: new Date().toISOString(),
  }));

  res.json({ results });
});

export default router;
