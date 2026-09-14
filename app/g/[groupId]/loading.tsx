import { PageLoader } from "@/components/Spinner";

// Next.js wraps this route segment's page (and everything nested under it —
// expenses, members, settings, expense detail — unless they define their
// own more specific loading.tsx) in a Suspense boundary using this as the
// fallback. GroupChrome (nav/header/FAB) lives in the layout ABOVE this, so
// it stays mounted and only the content area shows the spinner while a
// slower navigation resolves — instead of the page looking frozen.
export default function GroupLoading() {
  return <PageLoader />;
}
