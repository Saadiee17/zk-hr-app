async function run() {
    try {
        const res = await fetch('http://localhost:3000/api/sync/queue-debug');
        const text = await res.text();
        console.log("Body:", text);
    } catch (err) {
        console.error(err);
    }
}
run();
