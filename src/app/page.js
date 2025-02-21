export default function Home() {
  return (
    <div className="relative z-[-1] min-h-screen flex items-center justify-center">
      {/* Blurred gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl"></div>
      <div className="w-full max-w-[500px] bg-zinc-900 bg-opacity-50 mx-auto min-h-dvh relative z-10 items-center flex flex-col">
        <h1 className="relative text-white text-4xl font-bold">Hello World</h1>
      </div>
    </div>
  );
}
