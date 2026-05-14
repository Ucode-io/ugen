import { TemplateDashboardDetail } from "@/widgets/templates-board";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TemplateDashboardDetailPage({ params }: Props) {
  const { id } = await params;
  return <TemplateDashboardDetail id={id} />;
}
