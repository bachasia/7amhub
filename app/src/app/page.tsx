import { HubView } from "@/components/hub/hub-view";
import { FeedView } from "@/components/feed/feed-view";

export default function Home() {
  return (
    <>
      {/* Desktop (≥1024px) */}
      <div className="hub-only">
        <HubView />
      </div>
      {/* Mobile (<1024px) */}
      <div className="feed-only">
        <FeedView />
      </div>
      <style>{`
        .hub-only  { display: block; }
        .feed-only { display: none; }
        @media (max-width: 1023px) {
          .hub-only  { display: none; }
          .feed-only { display: flex; justify-content: center; }
        }
      `}</style>
    </>
  );
}
