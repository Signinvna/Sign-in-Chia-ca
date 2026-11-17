// Đăng ký Service Worker cho Offline Mode
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.log('SW Registration failed: ', err);
        });
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Helpers xử lý thời gian (phút)
function timeToMins(timeStr) {
    if (!timeStr) return 0;
    let [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function minsToTime(mins) {
    // Xử lý qua ngày (âm hoặc > 1440)
    mins = ((mins % 1440) + 1440) % 1440; 
    let h = Math.floor(mins / 60);
    let m = Math.floor(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function calcSignIn() {
    let std = document.getElementById('std-time').value;
    let offset = parseInt(document.getElementById('flight-type').value);
    if (!std) return alert("Vui lòng nhập giờ khởi hành");
    
    let signinMins = timeToMins(std) - offset;
    document.getElementById('signin-time-out').innerText = minsToTime(signinMins);
    document.getElementById('signin-result').classList.add('show');
}

function updateScenarioUI() {
    let sc = document.getElementById('scenario').value;
    let desc = document.getElementById('scenario-desc');
    let extraTH2 = document.getElementById('extra-inputs-th2');
    
    if (sc == '1') {
        desc.innerText = "Ca 1 nghỉ -> Giao ca -> Ca 2 nghỉ -> Chuẩn bị (bằng t/g giao ca) -> Mời khách -> Đáp.";
        extraTH2.style.display = 'none';
    } else if (sc == '2') {
        desc.innerText = "Ca 1 nghỉ -> Chuẩn bị -> Mời khách -> Ca 2 nghỉ -> Dậy trước khi đáp.";
        extraTH2.style.display = 'block';
    } else if (sc == '3') {
        desc.innerText = "Chia 3 ca đều nhau. Mời khách chen giữa ca 1 và ca 2. T/g chuẩn bị và giao ca được áp dụng.";
        extraTH2.style.display = 'block'; // Mượn input T/g mời ăn
    }
}

function calcShifts() {
    let sc = document.getElementById('scenario').value;
    let startMins = timeToMins(document.getElementById('shift-start').value);
    let landMins = timeToMins(document.getElementById('land-time').value);
    let mealMins = timeToMins(document.getElementById('meal-time').value);
    let handoverMins = parseInt(document.getElementById('handover-time').value);
    
    // Nếu giờ nhỏ hơn giờ bắt đầu, cộng thêm 24h để tính xuyên đêm
    if (landMins <= startMins) landMins += 1440;
    if (mealMins < startMins && sc != '2') mealMins += 1440;

    let resHTML = "";

    if (sc == '1') {
        // TH1: start -> C1 -> handover -> C2 -> prep(handover) -> meal
        let endRestMins = mealMins - handoverMins;
        if (endRestMins < startMins) endRestMins += 1440;
        
        let totalRestAvailable = endRestMins - startMins - handoverMins;
        let shiftLen = totalRestAvailable / 2;
        
        let c1End = startMins + shiftLen;
        let c2Start = c1End + handoverMins;
        let c2End = c2Start + shiftLen;

        resHTML += `<div class="result-item"><span>Ca 1:</span><strong>${minsToTime(startMins)} - ${minsToTime(c1End)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Giao ca:</span><strong>${minsToTime(c1End)} - ${minsToTime(c2Start)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Ca 2:</span><strong>${minsToTime(c2Start)} - ${minsToTime(c2End)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Chuẩn bị mời:</span><strong>${minsToTime(c2End)} - ${minsToTime(mealMins)}</strong></div>`;
    } 
    else if (sc == '2') {
        // TH2: start -> C1 -> prep -> meal -> C2 -> land - wakeup
        let mealDuration = parseInt(document.getElementById('meal-duration').value);
        let wakeupMins = parseInt(document.getElementById('wakeup-time').value);
        
        if (mealMins < startMins) mealMins += 1440;
        
        let c1End = mealMins - handoverMins; // handoverMins ở đây là T/g chuẩn bị
        let mealEnd = mealMins + mealDuration;
        let c2Start = mealEnd;
        let c2End = landMins - wakeupMins;
        
        resHTML += `<div class="result-item"><span>Ca 1:</span><strong>${minsToTime(startMins)} - ${minsToTime(c1End)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Chuẩn bị:</span><strong>${minsToTime(c1End)} - ${minsToTime(mealMins)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Mời khách:</span><strong>${minsToTime(mealMins)} - ${minsToTime(mealEnd)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Ca 2:</span><strong>${minsToTime(c2Start)} - ${minsToTime(c2End)}</strong></div>`;
    }
    else if (sc == '3') {
        // TH3: start -> C1 -> prep -> meal -> C2 -> handover -> C3 -> land - wakeup
        let mealDuration = parseInt(document.getElementById('meal-duration').value);
        let wakeupMins = parseInt(document.getElementById('wakeup-time').value);
        
        let c3End = landMins - wakeupMins;
        let totalFlightRest = c3End - startMins - mealDuration - (handoverMins * 2); // 1 prep meal + 1 handover
        let shiftLen = totalFlightRest / 3;

        let c1End = startMins + shiftLen;
        let mealEnd = c1End + handoverMins + mealDuration;
        let c2End = mealEnd + shiftLen;
        let c3Start = c2End + handoverMins;

        resHTML += `<div class="result-item"><span>Ca 1:</span><strong>${minsToTime(startMins)} - ${minsToTime(c1End)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Mời khách (đã gồm C.bị):</span><strong>${minsToTime(c1End)} - ${minsToTime(mealEnd)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Ca 2:</span><strong>${minsToTime(mealEnd)} - ${minsToTime(c2End)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Giao ca:</span><strong>${minsToTime(c2End)} - ${minsToTime(c3Start)}</strong></div>`;
        resHTML += `<div class="result-item"><span>Ca 3:</span><strong>${minsToTime(c3Start)} - ${minsToTime(c3End)}</strong></div>`;
    }

    document.getElementById('shift-result').innerHTML = resHTML;
    document.getElementById('shift-result').classList.add('show');
}

// Khởi tạo text mô tả ban đầu
updateScenarioUI();