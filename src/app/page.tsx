import dynamic from 'next/dynamic';
import ThreeDSpreadsheet from '@/components/ThreeDSpreadsheet';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-[calc(100vh-5rem)]">
        <ThreeDSpreadsheet initialSheets={3} initialRows={15} initialCols={8} />
      </div>
    </div>
  );
}
