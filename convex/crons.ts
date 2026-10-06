import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"remove stale guest workspaces",
	{ hourUTC: 4, minuteUTC: 0 },
	internal.users.cleanupGuests,
	{},
);

export default crons;
