import { HomeTabs } from '../components/HomeTabs';
import { SiteHeader } from '../components/SiteHeader';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <HomeTabs />
      </main>
    </div>
  );
}
