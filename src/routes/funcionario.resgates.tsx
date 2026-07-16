import { createFileRoute } from "@tanstack/react-router";
import { FuncionarioResgatesPanel } from "@/components/funcionario-resgates-panel";

export const Route = createFileRoute("/funcionario/resgates")({
  ssr: false,
  component: Resgates,
});

function Resgates() {
  return <FuncionarioResgatesPanel title="Resgates" />;
}
