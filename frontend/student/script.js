loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const studentId = document.querySelector('input[type="text"]').value;
    const password = document.querySelector('input[type="password"]').value;

    try {

        const response = await fetch(
            'http://127.0.0.1:5001/api/student/login',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, password })
            }
        );

        const data = await response.json();

        console.log("LOGIN RESPONSE:", data);

        if (!response.ok) {
            alert(data.message || "Invalid Credentials");
            return;
        }

        // RESTORED STORAGE OF TOKEN AND STUDENT INFO
        localStorage.setItem('token', data.token);
        localStorage.setItem('studentId', data.student.studentId);
        localStorage.setItem('student', JSON.stringify(data.student));

        alert("Login Successful!");

        window.location.href = "student.html";

    } catch (error) {
        console.error("Connection Error:", error);
        alert("Cannot reach the server!");
    }
});
