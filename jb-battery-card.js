const LitElement = Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;

const colors = {
    0: "#bf360c",
    10: "#c04807",
    20: "#ab5c10",
    30: "#ad6b0d",
    40: "#827717",
    60: "#33691e",
    80: "#1b5e20"
};

const simpleColors = {
    0: "#bf360c",
    15: "#ad6b0d",
    33: "#827717",
    66: "#1b5e20"
};

class JbBatteryCard extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.colorMap = colors;
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error("Please define an entity");
        }

        const root = this.shadowRoot;
        if (root.lastChild) root.removeChild(root.lastChild);

        const cardConfig = Object.assign({}, config);
        if (!cardConfig.scale) cardConfig.scale = "50px";

        const entityParts = this._splitEntityAndAttribute(cardConfig.entity);
        const statusEntityParts = this._splitEntityAndAttribute(
            cardConfig.entity.replace("_level", "_state")
        );

        cardConfig.entity = entityParts.entity;
        cardConfig.status_entity = statusEntityParts.entity;

        if (entityParts.attribute) cardConfig.attribute = entityParts.attribute;
        if (statusEntityParts.attribute) cardConfig.status_attribute = statusEntityParts.attribute;

        const card = document.createElement("ha-card");
        card.setAttribute("id", "card");
        card.setAttribute("aria-label", cardConfig.title);

        if (cardConfig.horizontal === true) {
            card.classList.add("horizontal");
        }

        const style = document.createElement("style");
        style.textContent = `
          ha-card {
            --base-unit: ${cardConfig.scale};
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 6% 0;
            font-size: 16.8px;
            box-sizing: border-box;
            justify-content: space-evenly;
            height: 100%;
          }

          ha-card.horizontal {
            flex-direction: row;
          }

          ha-icon {
            width: 40%;
            --mdc-icon-size: 100%;
          }

          #description {
            display: flex;
            flex-direction: column;
            align-items: center;
            line-height: 1.2;
          }

          #title {
            font-size: 0.9em;
          }

          #percent {
            font-size: 1.3em;
            font-weight: bold;
          }
        `;

        card.innerHTML = `
            <ha-icon id="icon" icon="mdi:battery"></ha-icon>

            <div id="description">
                <div id="title"></div>
                <div id="percent"></div>
            </div>

            <mwc-ripple></mwc-ripple>
        `;

        card.appendChild(style);

        card.addEventListener("click", () => {
            this._fire("hass-more-info", { entityId: cardConfig.entity });
        });

        root.appendChild(card);

        if (cardConfig.colors) {
            this.colorMap = cardConfig.colors;
        } else if (cardConfig.variant === "simple") {
            this.colorMap = simpleColors;
        } else {
            this.colorMap = colors;
        }

        this._config = cardConfig;
    }

    _splitEntityAndAttribute(entity) {
        let parts = entity.split(".");
        if (parts.length < 3) {
            return { entity };
        }
        return { attribute: parts.pop(), entity: parts.join(".") };
    }

    _fire(type, detail, options = {}) {
        const event = new Event(type, {
            bubbles: options.bubbles ?? true,
            cancelable: Boolean(options.cancelable),
            composed: options.composed ?? true
        });
        event.detail = detail || {};
        this.shadowRoot.dispatchEvent(event);
        return event;
    }

    _computeColor(value) {
        let numberValue = Number(value);
        let keys = Object.keys(this.colorMap).sort((a, b) => b - a);
        let key = keys.find(k => numberValue >= k);
        return this.colorMap[key];
    }

    _computeBatteryIcon(value, state) {
        let charging = (state === "charging" || state === "full") ? "-charging" : "";
        let level = Math.round(value / 10) * 10;

        if (this._config.variant === "simple") {
            if (value <= 15) return `mdi:battery${charging}-outline`;
            if (value <= 45) return `mdi:battery${charging}-low`;
            if (value <= 80) return `mdi:battery${charging}-medium`;
            return `mdi:battery${charging}-high`;
        }

        if (level === 0) return `mdi:battery${charging}-outline`;
        if (level < 100) return `mdi:battery${charging}-${level}`;
        return charging ? `mdi:battery-charging-100` : "mdi:battery";
    }

    _getEntityStateValue(entity, attribute) {
        return attribute ? entity.attributes[attribute] : entity.state;
    }

    set hass(hass) {
        const config = this._config;
        const root = this.shadowRoot;

        const entityState =
            parseInt(this._getEntityStateValue(hass.states[config.entity], config.attribute), 10) || "-";
        const statusState =
            this._getEntityStateValue(hass.states[config.status_entity], config.status_attribute);

        if (entityState !== this._entityState) {
            root.getElementById("title").textContent = config.title;
            root.getElementById("percent").textContent = `${entityState}%`;
            this._entityState = entityState;
        }

        if (statusState !== this._statusEntityState) {
            const icon = root.getElementById("icon");
            icon.setAttribute("icon", this._computeBatteryIcon(entityState, statusState));
            icon.style.color = this._computeColor(entityState);
            this._statusEntityState = statusState;
        }

        root.lastChild.hass = hass;
    }

    getCardSize() {
        return 1;
    }
}

console.log("%c 🪫 jb-battery-card ", "background:#222;color:#bada55");
customElements.define("jb-battery-card", JbBatteryCard);
