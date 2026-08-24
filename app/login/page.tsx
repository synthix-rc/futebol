import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { redirectTo } = await searchParams;
  const target = typeof redirectTo === "string" ? redirectTo : "/admin";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold">⚽ Painel do Admin</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Faça login para continuar.
        </p>
      </div>
      <LoginForm redirectTo={target} />
    </div>
  );
}
