export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "POST 요청만 허용됩니다."
    });
  }

  try {
    const { records } = req.body || {};

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "학생 학교생활 성찰 기록이 없습니다."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY가 Vercel 환경변수에 없습니다."
      });
    }

    /*
     * 학생 기록 정리
     */

    const recordText = records.map((record, index) => {
      return `
[학교생활 성찰 ${index + 1}]

작성일:
${record["타임스탬프"] || ""}

학년도:
${record["학년도"] || ""}

학번:
${record["학번"] || ""}

이름:
${record["이름"] || ""}

책임감·자기관리:
${record["책임감·자기관리"] || ""}

자기주도·성장:
${record["자기주도·성장"] || ""}

배려·소통:
${record["배려·소통"] || ""}

친구관계:
${record["친구관계"] || ""}

기억에 남는 일:
${record["기억에 남는 일"] || ""}

선생님께 꼭 하고 싶은 말:
${record["선생님께 꼭 하고 싶은 말"] || ""}
`;
    }).join("\n");

    /*
     * 행발 생성 프롬프트
     */

    const prompt = `
당신은 중학교 담임교사의 학교생활기록부
"행동특성 및 종합의견" 작성 보조 AI입니다.

아래는 한 학생이 여러 차례 작성한
학교생활 성찰 기록입니다.

이 기록만을 근거로 하여
학교생활기록부에 실제로 사용할 수 있는
행동특성 및 종합의견 문단을 작성하세요.

매우 중요한 규칙:

1. 반드시 학생 기록에 실제로 나타난 내용만 사용하세요.

2. 기록에 없는 행동, 성격, 능력, 활동을 절대로 만들어내지 마세요.

3. 여러 차례 기록에서 반복적으로 나타난 특징은 하나로 자연스럽게 통합하세요.

4. 서로 다른 시기의 기록에서 변화나 성장 모습이 나타난다면 자연스럽게 연결하세요.

5. 학생의 책임감, 자기관리, 자기주도성, 노력, 배려, 소통,
친구 관계, 협력, 갈등 해결 등의 모습을 기록에 근거하여 표현하세요.

6. "행복해요", "좋아요", "없음", "재밌어요"처럼
구체적인 근거가 없는 내용은 과도하게 해석하지 마세요.

7. 학생이 직접 작성한 내용을 그대로 학생의 말처럼 옮기지 말고,
교사가 관찰하고 기록한 것처럼 객관적으로 표현하세요.

8. 학생이 친구와 의견을 모아 문제를 해결한 경우에는
협력과 의사소통의 모습으로 자연스럽게 표현할 수 있습니다.

9. 학생이 자신의 행동을 바꾸려고 노력한 경우에는
그 변화와 노력을 반영하세요.

10. 과장된 칭찬이나 근거 없는 긍정 표현을 사용하지 마세요.

11. 학교생활기록부 문체를 사용하세요.
예:
~함.
~보임.
~나타냄.
~노력함.
~실천함.

12. 가운데점(·)은 사용하지 마세요.
필요하면 쉼표(,)를 사용하세요.

13. 2~3개의 자연스러운 문장으로 작성하세요.

14. 결과 앞뒤에 제목을 붙이지 마세요.

15. "AI 행발 표현", "학생 기록", "데이터가 없습니다",
"자료에 따르면", "기록이 부족함" 등의 설명을 절대로 붙이지 마세요.

16. "아래와 같이 작성할 수 있습니다"와 같은 안내 문장도 쓰지 마세요.

17. 반드시 최종 결과만 출력하세요.

18. 최종 결과는 반드시 학교생활기록부에 바로 붙여 넣을 수 있는
교사 관찰자 관점의 행발 문단이어야 합니다.

학생 학교생활 성찰 기록:

${recordText}
`;

    /*
     * Gemini API
     */

    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    const response = await fetch(apiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],

        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.4
        }
      })
    });

    /*
     * Gemini 응답을 text로 먼저 받음
     */

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({
        success: false,
        message: "Gemini 응답을 JSON으로 읽을 수 없습니다.",
        detail: responseText.substring(0, 500)
      });
    }

    /*
     * Gemini API 오류
     */

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message:
          data?.error?.message ||
          "Gemini API 호출에 실패했습니다."
      });
    }

    /*
     * AI 결과 추출
     */

    let result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    result = String(result).trim();

    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Gemini에서 생성된 행발 결과가 없습니다."
      });
    }

    /*
     * 혹시 AI가 제목이나 설명을 붙이면 제거
     */

    result = result
      .replace(/^✨\s*AI\s*행발\s*표현\s*/i, "")
      .replace(/^AI\s*행발\s*표현\s*/i, "")
      .replace(/^행동특성\s*및\s*종합의견\s*/i, "")
      .replace(/^결과\s*[:：]\s*/i, "")
      .trim();

    /*
     * 가운데점 제거
     */

    result = result.replace(/·/g, ",");

    /*
     * 1000바이트 제한
     */

    function cutTo1000Bytes(text) {
      let output = "";
      const encoder = new TextEncoder();

      for (const char of text) {
        const test = output + char;

        if (encoder.encode(test).length > 1000) {
          break;
        }

        output = test;
      }

      /*
       * 마지막 문장 단위로 정리
       */

      const lastPeriod = output.lastIndexOf(".");

      if (lastPeriod > 0) {
        output =
          output.substring(0, lastPeriod + 1);
      }

      return output.trim();
    }

    result = cutTo1000Bytes(result);

    /*
     * 최종 응답
     */

    return res.status(200).json({
      success: true,
      result
    });

  } catch (error) {

    console.error(
      "generate-haengbal 오류:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "행발 AI 생성 중 서버 오류가 발생했습니다."
    });
  }
}
