import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stickerPackRouter from "./sticker-pack";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stickerPackRouter);

export default router;
