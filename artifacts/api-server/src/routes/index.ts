import { Router, type IRouter } from "express";
import healthRouter from "./health";
import revenueLiftRouter from "./revenue-lift";
import encountersRouter from "./encounters";
import hpeRouter from "./hpe";
import eligibilityRouter from "./eligibility";
import athenaRouter from "./athena";
import teamsRouter from "./teams";
import feeScheduleRouter from "./fee-schedule";
import odataRouter from "./odata";

const router: IRouter = Router();

router.use(healthRouter);
router.use(revenueLiftRouter);
router.use(encountersRouter);
router.use(hpeRouter);
router.use(eligibilityRouter);
router.use(athenaRouter);
router.use(teamsRouter);
router.use(feeScheduleRouter);
router.use(odataRouter);

export default router;
