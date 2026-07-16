import { createFileRoute } from "@tanstack/react-router";
import { FuncionarioResgatesPanel } from "@/components/funcionario-resgates-panel";

export const Route = createFileRoute("/funcionario/vouchers")({
  ssr: false,
  component: Vouchers,
});

function Vouchers() {
  return <FuncionarioResgatesPanel title="Vouchers" />;
}
