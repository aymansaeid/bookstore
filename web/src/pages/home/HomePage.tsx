import { EncyclopediaBanner } from '@/features/home/components/EncyclopediaBanner';
import { HomeHero } from '@/features/home/components/HomeHero';
import {
  CategoryTiles,
  EfendiTeaser,
  MuhaqqiqsSection,
  PathsSection,
  PicksSection,
  PublisherStrip,
  ReaderShelves,
} from '@/features/home/components/HomeSections';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

/** Home (spec 5.1), in the spec's order. Every number and book comes from the API. */
export default function HomePage() {
  return (
    <>
      <DocumentTitle />
      <HomeHero />
      <PublisherStrip />
      <PicksSection />
      <PathsSection />
      <EncyclopediaBanner />
      <CategoryTiles />
      <EfendiTeaser />
      <ReaderShelves />
      <MuhaqqiqsSection />
    </>
  );
}
