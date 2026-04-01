import { Router, type IRouter } from "express";
import { z } from "zod";
import { AevsService, AevsNotFoundError, AevsTransportError } from "../services/aevs";

const router: IRouter = Router();
const aevsService = new AevsService();

const AevsRequestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must be YYYY-MM-DD"),
});

router.post("/eligibility/aevs", async (req, res) => {
  const parsed = AevsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "BadRequest",
      message: parsed.error.errors.map((e) => e.message).join("; "),
    });
    return;
  }

  try {
    const result = await aevsService.lookup(parsed.data);
    res.json(result);
  } catch (err) {
    if (err instanceof AevsNotFoundError) {
      res.status(422).json({
        error: "AevsNotFound",
        message: err.message,
      });
      return;
    }
    if (err instanceof AevsTransportError) {
      res.status(502).json({
        error: "AevsTransportError",
        message: err.message,
      });
      return;
    }
    throw err;
  }
});

export default router;
