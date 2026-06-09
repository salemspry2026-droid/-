import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, categoryId } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
       return NextResponse.json({ error: "API key is missing on the server" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `اكتب وصفاً تسويقياً قصيراً واحترافياً لمنتج B2B يسمى "${name}". التصنيف: ${categoryId === 'none' ? 'عام' : categoryId}. اجعله في جملتين كحد أقصى وباللغة العربية.`;
    
    const response = await ai.models.generateContent({ 
      model: "gemini-3.5-flash", 
      contents: prompt 
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Error generating description:", error);
    return NextResponse.json({ error: "Failed to generate description" }, { status: 500 });
  }
}
