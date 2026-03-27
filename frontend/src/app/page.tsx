"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobText, setJobText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSetFile(selected: File) {
    setFileError("");
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(selected.type)) {
      setFileError("Apenas arquivos .pdf ou .docx são aceitos.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFileError("O arquivo deve ter no máximo 5MB.");
      return;
    }
    setFile(selected);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function handleSubmit() {
    if (!file || !jobText.trim()) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("job_description", jobText);

      await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        body: formData,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const canSubmit = !!file && jobText.trim().length > 0 && !isLoading;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">ATS Analyzer</h1>
          <p className="mt-2 text-muted-foreground text-lg">Análise inteligente de currículos</p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Currículo</CardTitle>
            <CardDescription>Envie seu currículo em PDF ou DOCX (máximo 5MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed
                p-10 cursor-pointer transition-colors select-none
                ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"}
              `}
            >
              <span className="text-5xl">📄</span>
              {file ? (
                <div className="text-center">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(0)} KB — clique para trocar
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium text-foreground">Arraste o arquivo ou clique para selecionar</p>
                  <p className="text-sm text-muted-foreground mt-1">.pdf ou .docx</p>
                </div>
              )}
            </div>

            {fileError && (
              <p className="mt-2 text-sm text-destructive">{fileError}</p>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        {/* Job Description Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Descrição da Vaga</CardTitle>
            <CardDescription>Cole o texto completo da vaga para uma análise precisa</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Cole aqui a descrição da vaga..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              className="min-h-[240px] resize-y text-sm"
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {isLoading ? "Analisando..." : "Analisar Currículo"}
        </Button>

      </div>
    </main>
  );
}
