export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "POST 요청만 허용됩니다."
    });
  }

  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "학생 기록이 없습니다."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API 키가 설정되지 않았습니다."
      });
    }

    const recordText = records.map((record, index) => {
      return `
[수업성찰 ${index + 1}]
수업일: ${record["타임스탬프"] || ""}
내가 한 일: ${record["오늘 수업에서 내가 한 활동은 무엇인가요?"] || ""}
배운 점: ${record["오늘 활동을 통해 새롭게 알게 되거나 이해하게 된 점은 무엇인가요?( 예: 자료를 찾아보면서 같은 문제도 여러 가지 해결 방법이 있다는 것을 알게 되었다.)"] || ""}
어려움·해결: ${record["오늘 활동에서 어려웠던 점이나 잘 해결되지 않았던 점이 있었다면, 어떻게 해결했나요?(예: 자료를 찾는 데 어려움이 있었지만 검색어를 바꿔서 관련 자료를 찾았다.)"] || ""}
나의 기여: ${record["오늘 모둠·짝 활동에서 내가 한 기여는 무엇인가요? (여러 개 선택 가능)"] || ""}
`;
    }).join("\n");

    const prompt = `
당신은 중학교 정보 교과 교사의 학교생활기록부 작성 보조 AI입니다.

아래 학생의 여러 수업성찰 기록을 종합하여
교과 세부능력 및 특기사항에 활용할 수 있는 문장을 작성하세요.

규칙:
1. 여러 기록에서 반복되는 내용은 자연스럽게 통합하세요.
2. 서로 다른 활동에서 나타난 특징은 연결하여 표현하세요.
3. 학생이 실제로 작성한 내용에 근거해서만 작성하세요.
4. 기록에 없는 활동이나 능력을 임의로 만들어내지 마세요.
5. 학생의 행동과 활동을 중심으로 교사 관찰자 관점에서 작성하세요.
6. 과장된 표현은 사용하지 마세요.
7. "~함", "~보임", "~나타냄" 등의 학교생활기록부 문체를 사용하세요.
8. 결과만 출력하고 설명이나 제목은 출력하지 마세요.

학생 수업성찰 기록:
${recordText}
`;

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

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message: data.error?.message || "Gemini API 호출에 실패했습니다."
      });
    }

    const result =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({
      success: true,
      result: result.trim()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
