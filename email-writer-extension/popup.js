document.addEventListener("DOMContentLoaded", function () {
  // Load saved settings
  chrome.storage.sync.get(
    {
      tone: "professional",
      language: "en",
      length: "medium",
      customTone: "",
    },
    function (settings) {
      // Set selected tone tag
      const toneTag = document.querySelector(`[data-tone="${settings.tone}"]`);
      if (toneTag) toneTag.classList.add("active");

      // Set other form values
      document.getElementById("language").value = settings.language;
      document.getElementById("length").value = settings.length;
      document.getElementById("customTone").value = settings.customTone;
    }
  );

  // Handle tone tag clicks
  document.getElementById("toneTags").addEventListener("click", function (e) {
    if (e.target.classList.contains("tone-tag")) {
      // Remove active class from all tags
      document
        .querySelectorAll(".tone-tag")
        .forEach((tag) => tag.classList.remove("active"));
      // Add active class to clicked tag
      e.target.classList.add("active");
    }
  });

  // Handle save button click
  document.getElementById("saveButton").addEventListener("click", function () {
    const activeTone = document.querySelector(".tone-tag.active");
    const settings = {
      tone: activeTone ? activeTone.dataset.tone : "professional",
      language: document.getElementById("language").value,
      length: document.getElementById("length").value,
      customTone: document.getElementById("customTone").value,
    };

    // Save settings
    chrome.storage.sync.set(settings, function () {
      // Show save confirmation
      const saveBtn = document.getElementById("saveButton");
      saveBtn.textContent = "Saved!";
      setTimeout(() => {
        saveBtn.textContent = "Save Settings";
      }, 1500);
    });
  });
});
