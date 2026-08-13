export default async function handler(req, res) {

  // =========================
  // POST 요청만 허용
  // =========================

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "POST 요청만 허용됩니다."
    });
  }


  try {

    // =========================
    // 학생 기록 확인
    // =========================

    const { records } = req.body || {};

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "학생 기록이 없습니다."
      });
    }


    // =========================
    // Gemini API 키 확인
    // =========================

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API 키가 설정되지 않았습니다."
      });
    }


    // =========================
    // 학생 학교생활 성찰 기록 정리
    // =========================

    const recordText =
      records.map((record, index) => {

        return `
[학교생활 성찰 ${index + 1}]

작성일:
${record["타임스탬프"] || ""}

학교생활:
${record["  요즘 학교에서 나는 어떻게 지내나요?  "] || ""}

스스로 계획하거나 노력한 일:
${record["  스스로 계획하거나 노력한 일이 있나요?  "] || ""}

친구들과 지내면서 보인 모습:
${record["  친구들과 지내면서 어떤 모습을 보였나요?  "] || ""}

학급이나 학교에서 친구들과 지낸 모습:
${record["학급이나 학교에서 친구들과 어떻게 지냈나요?"] || ""}

기억에 남는 일:
${record["요즘 학교생활에서 가장 기억에 남는 일이 있다면 적어주세요\n설명:\n친구와 있었던 일, 내가 노력한 일, 어려움을 해결한 일, 뿌듯했던 일 등 자유롭게 적어주세요."] || ""}

선생님께 하고 싶은 말:
${record["학교생활에 대해 선생님께 꼭 하고 싶은 말이 있나요?\n설명:\n나의 학교생활, 친구 관계, 고민, 변화, 잘하고 있는 점 등 선생님께 이야기하고 싶은 내용을 자유롭게 적어주세요."] || ""}
`;

      }).join("\n");


    // =========================
    // 행발 AI 프롬프트
    // =========================

    const prompt = `
당신은 중학교 담임교사의 학교생활기록부 작성 보조 AI입니다.

아래 학생의 여러 학교생활 성찰 기록을 종합하여
학교생활기록부의 "행동특성 및 종합의견"에 활용할 수 있는
문장을 작성하세요.

규칙:

1. 여러 차례의 성찰 기록에서 반복적으로 나타나는 특징은 자연스럽게 통합하세요.

2. 서로 다른 기록에서 나타난 변화나 성장 모습이 있다면 연결하여 표현하세요.

3. 학생이 실제로 작성한 내용에 근거해서만 작성하세요.

4. 기록에 없는 행동, 성격, 능력, 활동을 임의로 만들어내지 마세요.

5. 학생의 학교생활 태도, 책임감, 자기관리, 자기주도성,
친구 관계, 소통과 협력 등을 중심으로 작성하세요.

6. "행복해요", "좋아요", "없음"처럼 구체적인 근거가 부족한 표현은
과도하게 해석하지 마세요.

7. 학생이 어려움을 해결하려고 노력했거나 행동의 변화를 직접 작성한 경우에는
이를 반영하세요.

8. 과장하거나 지나치게 긍정적으로 표현하지 마세요.

9. "~함", "~보임", "~나타냄", "~노력함" 등의
학교생활기록부 문체를 사용하세요.

10. 교사가 실제로 관찰하고 기록한 것처럼 자연스럽게 작성하세요.

11. 결과만 출력하고 설명이나 제목은 출력하지 마세요.

12. 생기부 문장에는 가운데점(·)을 사용하지 마세요.
가운데점 대신 쉼표(,)를 사용하세요.

13. 2~3개의 자연스러운 문장으로 작성하세요.

학생 학교생활 성찰 기록:

${recordText}
`;


    // =========================
    // Gemini API
    // =========================

    // ★ 세특에서 현재 정상 작동하는 구조와 동일하게 사용
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + apiKey,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );


    // =========================
    // Gemini 응답
    // =========================

    const data =
      await response.json();


    // =========================
    // Gemini 오류
    // =========================

    if (!response.ok) {

      return res.status(500).json({
        success: false,
        message:
          data?.error?.message ||
          "Gemini API 호출에 실패했습니다."
      });

    }


    // =========================
    // AI 결과 추출
    // =========================

    let result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";


    result =
      result.trim();


    if (!result) {

      return res.status(500).json({
        success: false,
        message:
          "Gemini에서 생성된 결과가 없습니다."
      });

    }


    // =========================
    // UTF-8 기준 1000바이트 제한
    // =========================

    function cutTo1000Bytes(text) {

      let output = "";

      const encoder =
        new TextEncoder();


      for (const char of text) {

        const test =
          output + char;


        if (
          encoder.encode(test).length > 1000
        ) {
          break;
        }


        output =
          test;

      }


      // 문장 중간에서 끊기지 않도록
      // 마지막 마침표까지 정리

      const lastPeriod =
        output.lastIndexOf(".");


      if (lastPeriod > 0) {

        output =
          output.substring(
            0,
            lastPeriod + 1
          );

      }


      return output.trim();

    }


    result =
      cutTo1000Bytes(result);


    // =========================
    // 성공
    // =========================

    return res.status(200).json({

      success: true,

      result: result

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
        "행발 AI 생성 중 오류가 발생했습니다."

    });

  }

}
