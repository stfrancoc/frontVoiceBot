let conversationHistory = [];

function startRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("El reconocimiento de voz no es compatible con este navegador.");
    alert("El reconocimiento de voz no es compatible con este navegador. Por favor, intenta usar Google Chrome.");
    return;
  }

  if ('speechSynthesis' in window) {
    console.log('Speech synthesis disponible');
    const testSpeech = new SpeechSynthesisUtterance("Esto es una prueba de voz.");
    testSpeech.lang = 'es-ES';
    window.speechSynthesis.speak(testSpeech);
  } else {
    console.error('Speech synthesis no está disponible en este navegador.');
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const transcriptLowerCase = transcript.toLowerCase();
    console.log("Usuario dijo:", transcriptLowerCase);
    addToConversation('user', transcriptLowerCase);  // Guardamos el mensaje del usuario
    sendToBackend(transcriptLowerCase);
  };

  recognition.onerror = (event) => {
    console.error("Error al capturar el audio:", event.error);
  };
}

function addToConversation(role, message) {
  conversationHistory.push({ role, message });
  updateConversationDisplay();  // Actualizamos la vista
}

// Formatear el texto de respuesta para eliminar asteriscos u otros caracteres no deseados
function formatResponseText(responseText) {
  return responseText.replace(/\*/g, '');  // Elimina los asteriscos
}

// Muestra la respuesta de la IA en pantalla y la convierte a audio
function displayResponse(responseText, emotion) {
  const formattedText = formatResponseText(responseText); // Formateamos el texto
  const emotionText = emotion ? `Emoción detectada: ${emotion}` : "";
  document.getElementById("response-text").innerText = `${formattedText}\n${emotionText}`;
  speakResponse(formattedText);  // Usamos el texto formateado
  addToConversation('bot', formattedText);  // Guardamos la respuesta del bot
}

// Convierte el texto de la IA en audio y lo reproduce
function speakResponse(responseText) {
  const synth = window.speechSynthesis;

  // Detener cualquier reproducción anterior
  if (synth.speaking) {
    synth.cancel();
  }

  const speech = new SpeechSynthesisUtterance(responseText);
  speech.lang = 'es-ES'; // Cambiar el idioma si es necesario
  speech.rate = 1; // Velocidad normal
  speech.pitch = 1; // Tono normal

  synth.speak(speech);
}

// Envía el texto al backend
async function sendToBackend(userMessage) {
  const userId = document.getElementById("user-select").value;  // Obtener el ID del usuario seleccionado
  const payload = {
    message: userMessage,
    customer_id: Number(userId)  // Usar el ID del cliente seleccionado
  };

  try {
    const response = await fetch('http://127.0.0.1:8000/gemini/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Error en la respuesta del backend:', response.status, response.statusText);
      alert("Hubo un problema al procesar tu solicitud. Intenta nuevamente.");
      return;
    }

    const data = await response.json();
    console.log('Respuesta del backend:', data);

    // Mostrar la respuesta en pantalla y reproducir en audio
    displayResponse(data.response, data.emotion);
  } catch (error) {
    console.error('Error al enviar al backend:', error);
    alert("No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.");
  }
}

// Actualizar la vista con el historial de la conversación
function updateConversationDisplay() {
  const conversationContainer = document.getElementById("conversation-container");
  conversationContainer.innerHTML = '';  // Limpiamos el contenedor antes de volver a renderizar

  conversationHistory.forEach(entry => {
    const messageElement = document.createElement("div");
    messageElement.classList.add(entry.role);  // Agrega clases 'user' o 'bot' para diferenciar
    messageElement.textContent = entry.message;
    conversationContainer.appendChild(messageElement);
  });
}

// Exportar la conversación como un archivo de texto
function exportConversation() {
  const conversationText = conversationHistory.map(entry => {
    return `${entry.role === 'user' ? 'Usuario' : 'Bot'}: ${entry.message}`;
  }).join('\n');

  const blob = new Blob([conversationText], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'conversation.txt';  // Nombre del archivo
  link.click();
}

function endInteraction() {
  const conversationText = conversationHistory.map(entry => entry.message).join(' ');
  
  // Enviar al backend para análisis de emociones y costos
  analyzeEmotionAndCost(conversationText);
}

async function analyzeEmotionAndCost(conversationText) {
  const payload = {
    conversation: conversationText,  // Enviar toda la conversación
  };

  try {
    const response = await fetch('http://127.0.0.1:8000/analyze_emotion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    // Mostrar los resultados en la interfaz
    displayEmotionAnalysis(data.emotion, data.sentiment, data.negotiationScore);
    displayCostAnalysis(data.tokensUsed, data.estimatedCost);
  } catch (error) {
    console.error('Error al analizar emociones y costos:', error);
  }
}

function displayEmotionAnalysis(emotion, sentiment, negotiationScore) {
  document.getElementById("emotion-analysis").innerText = `Emoción Dominante: ${emotion}\nSentimiento: ${sentiment}\nIndicador de Negociación: ${negotiationScore}%`;
}

function displayCostAnalysis(tokensUsed, estimatedCost) {
  document.getElementById("cost-analysis").innerText = `Tokens Usados: ${tokensUsed}\nCosto Estimado: $${estimatedCost}`;
}
