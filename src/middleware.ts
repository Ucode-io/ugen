import { routing } from "./shared/lib/i18n";
import createMiddleware from "next-intl/middleware";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|go|_next|.*\\..*).*)"],
};
