import { corsHeaders } from '../_shared/cors.ts'

// DeepLで翻訳する関数
async function translate(text: string, targetLang: 'JA' | 'EN', authKey: string) {
  if (!text || (Array.isArray(text) && text.length === 0)) return Array.isArray(text) ? [] : ""
  const params = new URLSearchParams({ auth_key: authKey, target_lang: targetLang });
  (Array.isArray(text) ? text : [text]).forEach(t => params.append('text', t));

  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!response.ok) return Array.isArray(text) ? text.map(t => `[Err:${t}]`) : `[Err]`;
  const data = await response.json();
  const translations = data.translations.map((t: any) => t.text);
  return Array.isArray(text) ? translations : translations[0];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const qaPairs = body.qaPairs || []
    const positiveFeedback = body.positiveFeedback || []
    const allergies = body.allergies || []
    const dislikes = body.dislikes || []
    const dislikedSuggestions = body.dislikedSuggestions || []

    // qaPairsを "Q: 質問\nA: 回答" の形式に変換
    const conversationHistory = qaPairs.map((pair: any) => `Q: ${pair.question}\nA: ${pair.answer}`).join('\n');

    // --- 1. Geminiで料理名を提案してもらう ---
    const prompt = `
    # 命令書
    あなたはプロの栄養管理士兼料理研究家です。以下のユーザーとの会話履歴を分析し、制約条件を**絶対に**守って、ユーザーの状況を深く理解した上で、最適な料理を3つ提案してください。
    
    # ユーザーとの会話履歴
    ${conversationHistory || '会話履歴はありません。'}
    - 過去の良い評価: ${positiveFeedback.join(', ') || 'なし'}
    
    # 制約条件
    - 以下の食材はアレルギーのため絶対に使用しないでください: ${allergies.join(', ') || 'なし'}
    - 以下の食材は好みではないためなるべく避けてください: ${dislikes.join(', ') || 'なし'}
    - ユーザーは以前、以下の料理を「違う」と判断しました。これらは提案しないでください: ${dislikedSuggestions.join(', ') || 'なし'}
    - 回答は**料理名のみ**とする。説明、前置き、言い訳、その他の文章は一切含めないこと。
    - 回答は必ず**カンマ区切り**で出力すること。例: 豚の生姜焼き,親子丼,カレーライス
    
    # 出力形式
    料理名1,料理名2,料理名3
    `
    const geminiKey = Deno.env.get('GOOGLE_API_KEY')!
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    )
    if (!geminiResponse.ok) throw new Error('Gemini API request failed')
    const geminiData = await geminiResponse.json()
    const menuNames = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '').split(',').map((s: string) => s.trim()).filter((s: string) => s)

    // --- 2. 各料理の詳細情報をSpoonacularとDeepLで取得 ---
    const spoonacularKey = Deno.env.get('SPOONACULAR_API_KEY')!
    const deepLKey = Deno.env.get('DEEPL_API_KEY')!

    const detailedMenus = await Promise.all(
      menuNames.map(async (menuNameJa: string) => {
        try {
          const menuNameEn = await translate(menuNameJa, 'EN', deepLKey)
              const searchUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${menuNameEn}&number=1&instructionsRequired=true&apiKey=${spoonacularKey}`
              const searchData = (await (await fetch(searchUrl)).json());
              if (!searchData.results?.length) return { menu_name: menuNameJa, image_url: "", ingredients: [], instructions: [] };

              const recipeId = searchData.results[0].id;
              const infoUrl = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${spoonacularKey}`;
              const details = (await (await fetch(infoUrl)).json());

              const titleJa = await translate(details.title, 'JA', deepLKey);
              const ingredientsEn = details.extendedIngredients?.map((i: any) => i.original) || [];
              const ingredientsJa = await translate(ingredientsEn, 'JA', deepLKey);

              let instructionsJa: string[] = [];
              if (details.analyzedInstructions?.length > 0 && details.analyzedInstructions[0].steps?.length > 0) {
                  const instructionsEn = details.analyzedInstructions[0].steps.map((s: any) => s.step);
                  instructionsJa = await translate(instructionsEn, 'JA', deepLKey);
              }

              return {
                menu_name: titleJa || menuNameJa,
                image_url: details.image || "",
                ingredients: ingredientsJa,
                instructions: instructionsJa,
              }
        } catch (e) {
            return { menu_name: menuNameJa, image_url: "", ingredients: [], instructions: [], error: e.message };
        }
      })
    )

    return new Response(JSON.stringify({ menus: detailedMenus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})