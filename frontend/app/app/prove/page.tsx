import { ProveCard } from "@/components/ProveCard";
import { ProveFDC } from "@/components/ProveFDC";

export default function ProvePage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <ProveCard />
      <ProveFDC />
    </div>
  );
}
