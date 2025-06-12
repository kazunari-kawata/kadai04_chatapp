// 初期設定
// 読み込んだfirebaseConfigで初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    getDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
// 読み込み (from以降のpathは置いたところへの相対path)
import firebaseConfig from "./firebaseConfig.js";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 以下より処理
// DBにデータ登録
$(document).ready(function () {
    let selectedQuestionId = null; // 支援対象の質問IDを保持

    $("#send").on("click", async function () {
        const postData = {
            questionTitle: $("#questionTitle").val(),
            questionText: $("#questionText").val(),
            targetAmount: $("#targetAmount").val(),
            currentAmount: 0,
            createdAt: serverTimestamp(),
        };
        console.log(postData);
        try {
            await addDoc(collection(db, "questions"), postData);
            $("#questionTitle").val("");
            $("#questionText").val("");
            $("#targetAmount").val("");
            // alert("投稿が成功しました！");
        } catch (error) {
            console.error("投稿に失敗しました: ", error);
            alert("投稿に失敗しました。");
        }
    });

    // 質問をクリックした際にポップアップ表示
    $(document).on("click", ".question", function () {
        const questionId = $(this).closest(".question").data("id");
        const questionText = $(this).closest(".question").data("text");
        selectedQuestionId = questionId;
        $("#popup-text").text(`${questionText}`);
        $("#popup").fadeIn();
    });

    // 支援金額を送信
    $("#submit-support").on("click", async function () {
        const supportAmount = parseInt($("#supportAmount").val(), 10);
        if (isNaN(supportAmount) || supportAmount <= 0) {
            alert("正しい金額を入力してください。");
            return;
        }

        try {
            // Firestoreで該当の質問を更新
            const questionRef = doc(db, "questions", selectedQuestionId);
            const questionSnapshot = await getDoc(questionRef);
            if (questionSnapshot.exists()) {
                const currentAmount =
                    questionSnapshot.data().currentAmount || 0;
                const targetAmount = questionSnapshot.data().targetAmount || 1;

                // 支援金額を加算
                const updatedAmount = currentAmount + supportAmount;
                await updateDoc(questionRef, { currentAmount: updatedAmount });

                // 目標金額に達した場合、質問を回答済みリストに移動
                if (updatedAmount >= targetAmount) {
                    const answeredQuestion = questionSnapshot.data();
                    await addDoc(
                        collection(db, "answeredQuestions"),
                        answeredQuestion
                    );
                    await deleteDoc(questionRef);
                }
            }

            $("#popup").fadeOut();
            $("#supportAmount").val("");
        } catch (error) {
            console.error("支援金額の更新に失敗しました: ", error);
            alert("支援金額の更新に失敗しました。");
        }
    });

    // ポップアップを閉じる
    $("#close-popup").on("click", function () {
        $("#popup").fadeOut();
    });
});

// データ取得処理
function questionDocuments(docs) {
    return docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}

onSnapshot(
    query(collection(db, "questions"), orderBy("currentAmount", "desc")),
    (snapshot) => {
        const questions = questionDocuments(snapshot.docs);
        // 一旦空に
        $("#questions").empty();
        // 質問がなければメッセージ表示
        if (questions.length === 0) {
            $("#questions").append("<p>質問がありません。</p>");
            return;
        }
        // 質問とゲージの表示
        questions.forEach((q) => {
            const current = q.currentAmount || 0;
            const target = q.targetAmount || 1;
            const percent = Math.min((current / q.targetAmount) * 100, 100);

            $("#questions").append(`
                <li class="question" data-id="${q.id}" data-text="${q.questionText}">
                    <div class="question-title">
                        <p>${q.questionTitle}</p>
                    </div>
                    <div class="gauge">
                        <div class="progress-bar">
                            <div class="progress-bar-inner" style="--percent: ${percent}%;"></div>
                        </div>
                    </div>
                    <div class="question-support">
                        <p>¥${current} / ¥${target}</p>
                    </div>
                </li>
    `);
        });
    }
);
