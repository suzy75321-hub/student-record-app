export default async function handler(req, res) {

  // =====================================================
  // GET 요청만 허용
  // =====================================================

  if (req.method !== "GET") {

    return res.status(405).json({
      success: false,
      message: "GET 요청만 허용됩니다."
    });

  }


  // =====================================================
  // 최신 행발 Google Apps Script 주소
  // =====================================================

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxliyelrU4iOj2F0MJcmG8KbquIuHO23c8bYyNDljh0BqbH0CZa8N1dV_AXbAFrs9-3/exec";


  try {

    // ===================================================
    // Google Apps Script 호출
    // ===================================================

    const response =
      await fetch(
        GOOGLE_SCRIPT_URL,
        {
          method: "GET",
          redirect: "follow"
        }
      );


    // ===================================================
    // 응답을 먼저 text로 받음
    // ===================================================

    const responseText =
      await response.text();


    console.log(
      "Google Apps Script 행발 응답:",
      responseText.substring(0, 1000)
    );


    // ===================================================
    // JSON 변환
    // ===================================================

    let data;

    try {

      data =
        JSON.parse(responseText);

    } catch (error) {

      return res.status(500).json({

        success: false,

        message:
          "Google Apps Script가 JSON을 반환하지 않았습니다.",

        detail:
          responseText.substring(0, 500)

      });

    }


    // ===================================================
    // Google Apps Script 오류
    // ===================================================

    if (!response.ok) {

      return res.status(500).json({

        success: false,

        message:
          data?.message ||
          data?.error ||
          "Google Apps Script 호출에 실패했습니다."

      });

    }


    if (!data.success) {

      return res.status(500).json({

        success: false,

        message:
          data.message ||
          "행발 데이터를 불러오지 못했습니다."

      });

    }


    // ===================================================
    // 데이터 확인
    // ===================================================

    const records =
      Array.isArray(data.data)
        ? data.data
        : [];


    // ===================================================
    // Vercel → 브라우저 응답
    // ===================================================

    return res.status(200).json({

      success: true,

      data: records

    });


  } catch (error) {

    console.error(
      "haengbal-data 오류:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error?.message ||
        "행발 데이터를 불러오는 중 오류가 발생했습니다."

    });

  }

}
