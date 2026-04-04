document.querySelectorAll("[data-quiz]").forEach((quiz) => {
  const result = quiz.parentElement.querySelector(".quiz-result");

  quiz.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const isCorrect = button.dataset.correct === "true";

      quiz.querySelectorAll("button").forEach((item) => {
        item.classList.remove("correct", "wrong");
      });

      button.classList.add(isCorrect ? "correct" : "wrong");
      result.textContent = isCorrect
        ? "Doğru. Algoritma, adım adım yapılan planlı iştir."
        : "Tekrar düşün. Algoritma, rastgele değil sıralı adımlardır.";
    });
  });
});

const sequenceButton = document.getElementById("sequence-check");
const sequenceResult = document.getElementById("sequence-result");

if (sequenceButton && sequenceResult) {
  sequenceButton.addEventListener("click", () => {
    sequenceResult.textContent = "Evet. Adımlar doğru sıradaysa bu da bir algoritmadır.";
  });
}
