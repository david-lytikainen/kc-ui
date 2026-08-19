import GalleryPreview from "./GalleryPreview";


type GalleryPageProps = {
  onOpenItem: (itemId: number) => void;
  onOpenOrder: (orderNumber: string) => void;
};

export default function GalleryPage({ onOpenItem, onOpenOrder }: GalleryPageProps) {
  return <GalleryPreview mode="full" onOpenItem={onOpenItem} onOpenOrder={onOpenOrder} />;
}
