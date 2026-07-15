let rsaKeyPair = null;

/** 将 Uint8Array 转为 Base64，分块避免大数组栈溢出 */
function rsaBytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** Base64 解码为 Uint8Array */
function rsaBase64ToBytes(b64) {
  const bin = atob(String(b64 || "").trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function rsaGenKeys() {
  const out = document.getElementById("rsaOutput");
  const bits = parseInt(document.getElementById("rsaBits").value);
  try {
    rsaKeyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: bits,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
    const pub = await crypto.subtle.exportKey("spki", rsaKeyPair.publicKey);
    const priv = await crypto.subtle.exportKey("pkcs8", rsaKeyPair.privateKey);
    const pubB64 = rsaBytesToBase64(new Uint8Array(pub));
    const privB64 = rsaBytesToBase64(new Uint8Array(priv));
    document.getElementById("rsaPubKey").value = pubB64;
    document.getElementById("rsaPrivKey").value = privB64;
    out.textContent = "密钥对生成成功 (" + bits + " bit)";
  } catch (e) {
    out.textContent = "生成失败: " + e.message;
  }
}

async function rsaEncrypt() {
  const out = document.getElementById("rsaOutput");
  const input = document.getElementById("rsaInput").value;
  let pubKey = document.getElementById("rsaPubKey").value.trim();
  if (!input) {
    out.textContent = "请输入明文";
    return;
  }
  try {
    let key;
    if (pubKey) {
      const raw = rsaBase64ToBytes(pubKey);
      key = await crypto.subtle.importKey(
        "spki",
        raw,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"],
      );
    } else if (rsaKeyPair) {
      key = rsaKeyPair.publicKey;
    } else {
      out.textContent = "请先生成密钥对或粘贴公钥";
      return;
    }
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      key,
      new TextEncoder().encode(input),
    );
    out.textContent = rsaBytesToBase64(new Uint8Array(encrypted));
  } catch (e) {
    out.textContent = "加密失败: " + e.message;
  }
}

async function rsaDecrypt() {
  const out = document.getElementById("rsaOutput");
  const input = document.getElementById("rsaInput").value;
  let privKey = document.getElementById("rsaPrivKey").value.trim();
  if (!input) {
    out.textContent = "请输入密文";
    return;
  }
  try {
    let key;
    if (privKey) {
      const raw = rsaBase64ToBytes(privKey);
      key = await crypto.subtle.importKey(
        "pkcs8",
        raw,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"],
      );
    } else if (rsaKeyPair) {
      key = rsaKeyPair.privateKey;
    } else {
      out.textContent = "请先生成密钥对或粘贴私钥";
      return;
    }
    const raw = rsaBase64ToBytes(input);
    const decrypted = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      key,
      raw,
    );
    out.textContent = new TextDecoder().decode(decrypted);
  } catch (e) {
    out.textContent = "解密失败: " + e.message;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    rsaBytesToBase64: rsaBytesToBase64,
    rsaBase64ToBytes: rsaBase64ToBytes,
  };
}
