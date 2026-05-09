const loginForm = document.querySelector('form');

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

        if (response.ok) {

            alert("Login Successful!");
            localStorage.setItem('token', data.token);

            const studentObj = data.student;

            if (!studentObj || !studentObj.studentId) {
                alert("Invalid server response");
                return;
            }

            window.location.href =
                `student.html?studentId=${studentObj.studentId}`;

        } else {
            alert(data.message || "Invalid Credentials");
        }

    } catch (error) {
        console.error("Connection Error:", error);
        alert("Cannot reach the server!");
    }
});
