import GalleryPreview from "./GalleryPreview";


type GalleryPageProps = {
  onOpenOrder: (orderNumber: string) => void;
};

export default function GalleryPage({ onOpenOrder }: GalleryPageProps) {
  return <GalleryPreview mode="full" onOpenOrder={onOpenOrder} />;
}
