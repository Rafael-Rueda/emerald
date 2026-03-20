export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Workspace login required</h1>
      <p className="text-sm text-muted-foreground">
        You must authenticate before accessing <code>/admin</code> routes.
      </p>
    </main>
  );
}
