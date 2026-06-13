localStorage.clear();

document.getElementById("loginBtn").addEventListener("click", async () => {

  const teacherId = document.getElementById("teacherId").value;
  const password = document.getElementById("password").value;

  try {

    const res = await fetch("https://academic-management-backend-biar.onrender.com/api/teacher/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ teacherId, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    // STORE LOGIN DATA PROPERLY
    localStorage.setItem("token", data.token);
    localStorage.setItem("teacher", JSON.stringify(data.teacher));

    window.location.href = "teacher.html";

  } catch (err) {
    console.log(err);
    alert("Server error");
  }
});