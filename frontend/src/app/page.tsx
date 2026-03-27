import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">ATS Analyzer</CardTitle>
          <CardDescription className="text-base">
            Análise inteligente de currículos
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button size="lg">Começar análise</Button>
        </CardContent>
      </Card>
    </main>
  );
}
