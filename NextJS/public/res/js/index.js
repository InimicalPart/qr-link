document.getElementById("logOut").addEventListener("submit", () => {
    document.getElementById("logOutButton").disabled = true;
    document.getElementById("logOutButton").innerText = "Logging out...";
    document.getElementById("logOutButton").style.color = "lightgray"
});