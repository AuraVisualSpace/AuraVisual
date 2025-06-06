class SPLSimulator {
    constructor() {
        console.log('SPLSimulator constructor started');
        this.mainCanvas = document.getElementById('mainView');
        this.mainCtx = this.mainCanvas.getContext('2d');
        
        console.log('Canvas element:', this.mainCanvas);
        console.log('Canvas context:', this.mainCtx);
        
        if (!this.mainCanvas || !this.mainCtx) {
            console.error('Canvas or context not found!');
            return;
        }
        
        this.setupEventListeners();
        this.updateSimulation();
        console.log('SPLSimulator constructor completed');
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners');
        const controls = [
            'roomWidth', 'roomHeight', 'roomDepth', 'maxSPL', 'speakerWall', 
            'speakerX', 'speakerY', 'speakerZ', 'horizontalRotation', 
            'verticalTilt', 'viewMode'
        ];
        
        controls.forEach(control => {
            const element = document.getElementById(control);
            if (!element) {
                console.error(`Element not found: ${control}`);
                return;
            }
            
            element.addEventListener('change', () => {
                this.updateDisplayValues();
                this.updateSimulation();
            });
            element.addEventListener('input', () => {
                this.updateDisplayValues();
                this.updateSimulation();
            });
        });
        
        this.updateDisplayValues();
        console.log('Event listeners setup complete');
    }
    
    updateDisplayValues() {
        const elements = [
            { id: 'speakerXValue', source: 'speakerX', suffix: '%' },
            { id: 'speakerYValue', source: 'speakerY', suffix: '%' },
            { id: 'speakerZValue', source: 'speakerZ', suffix: '%' },
            { id: 'horizontalRotationValue', source: 'horizontalRotation', suffix: '°' },
            { id: 'verticalTiltValue', source: 'verticalTilt', suffix: '°' }
        ];
        
        elements.forEach(el => {
            const sourceEl = document.getElementById(el.source);
            const targetEl = document.getElementById(el.id);
            if (sourceEl && targetEl) {
                targetEl.textContent = sourceEl.value + el.suffix;
            }
        });
    }
    
    getParameters() {
        const params = {
            roomWidth: parseFloat(document.getElementById('roomWidth').value),
            roomHeight: parseFloat(document.getElementById('roomHeight').value),
            roomDepth: parseFloat(document.getElementById('roomDepth').value),
            maxSPL: parseFloat(document.getElementById('maxSPL').value),
            speakerWall: document.getElementById('speakerWall').value,
            speakerX: parseFloat(document.getElementById('speakerX').value) / 100,
            speakerY: parseFloat(document.getElementById('speakerY').value) / 100,
            speakerZ: parseFloat(document.getElementById('speakerZ').value) / 100,
            horizontalRotation: parseFloat(document.getElementById('horizontalRotation').value),
            verticalTilt: parseFloat(document.getElementById('verticalTilt').value),
            viewMode: document.getElementById('viewMode').value
        };
        
        console.log('Parameters:', params);
        return params;
    }
    
    getSpeakerPosition(params) {
        const { roomWidth, roomHeight, roomDepth, speakerWall, speakerX, speakerY, speakerZ } = params;
        
        let position;
        switch (speakerWall) {
            case 'front':
                position = { 
                    x: speakerX * roomWidth, 
                    y: 0, 
                    z: speakerZ * roomHeight 
                };
                break;
            case 'back':
                position = { 
                    x: speakerX * roomWidth, 
                    y: roomDepth, 
                    z: speakerZ * roomHeight 
                };
                break;
            case 'left':
                position = { 
                    x: 0, 
                    y: speakerY * roomDepth, 
                    z: speakerZ * roomHeight 
                };
                break;
            case 'right':
                position = { 
                    x: roomWidth, 
                    y: speakerY * roomDepth, 
                    z: speakerZ * roomHeight 
                };
                break;
            default:
                position = { 
                    x: roomWidth/2, 
                    y: 0, 
                    z: speakerZ * roomHeight 
                };
        }
        
        console.log('Speaker position:', position);
        return position;
    }
    
    getSpeakerDirection(params) {
        const { speakerWall, horizontalRotation, verticalTilt } = params;
        const horizRotRad = (horizontalRotation * Math.PI) / 180;
        const vertTiltRad = (verticalTilt * Math.PI) / 180;
        
        // Base direction depending on wall
        let baseDirection;
        switch (speakerWall) {
            case 'front':
                baseDirection = { x: 0, y: 1, z: 0 };
                break;
            case 'back':
                baseDirection = { x: 0, y: -1, z: 0 };
                break;
            case 'left':
                baseDirection = { x: 1, y: 0, z: 0 };
                break;
            case 'right':
                baseDirection = { x: -1, y: 0, z: 0 };
                break;
            default:
                baseDirection = { x: 0, y: 1, z: 0 };
        }
        
        // Apply horizontal rotation (around Z-axis)
        let rotatedDir = {
            x: baseDirection.x * Math.cos(horizRotRad) - baseDirection.y * Math.sin(horizRotRad),
            y: baseDirection.x * Math.sin(horizRotRad) + baseDirection.y * Math.cos(horizRotRad),
            z: baseDirection.z
        };
        
        // Apply vertical tilt
        const horizontalMagnitude = Math.sqrt(rotatedDir.x * rotatedDir.x + rotatedDir.y * rotatedDir.y);
        
        const direction = {
            x: rotatedDir.x * Math.cos(vertTiltRad),
            y: rotatedDir.y * Math.cos(vertTiltRad),
            z: horizontalMagnitude * Math.sin(vertTiltRad)
        };
        
        console.log('Speaker direction:', direction);
        return direction;
    }
    
    calculateSPL(distance, horizontalAngle, verticalAngle, maxSPL) {
        if (distance <= 0) return maxSPL;
        
        // Distance attenuation (6dB per doubling of distance)
        const distanceAttenuation = 20 * Math.log10(distance);
        
        // Horizontal angular attenuation (90° dispersion)
        const normalizedHorizAngle = Math.abs(horizontalAngle) / 45;
        const horizAngularAttenuation = normalizedHorizAngle > 1 ? -20 : -6 * Math.pow(normalizedHorizAngle, 2);
        
        // Vertical angular attenuation (45° dispersion)
        const normalizedVertAngle = Math.abs(verticalAngle) / 22.5;
        const vertAngularAttenuation = normalizedVertAngle > 1 ? -20 : -6 * Math.pow(normalizedVertAngle, 2);
        
        // Combined attenuation
        const totalAttenuation = distanceAttenuation - horizAngularAttenuation - vertAngularAttenuation;
        
        return Math.max(0, maxSPL - totalAttenuation);
    }
    
    getSPLColor(spl) {
        // Keep the original hex color function for backward compatibility
        if (spl >= 110) return '#ff0000';
        if (spl >= 100) return '#ff8000';
        if (spl >= 90) return '#ffff00';
        if (spl >= 80) return '#80ff00';
        if (spl >= 70) return '#00ff80';
        if (spl >= 60) return '#0080ff';
        return '#0000ff';
    }
    
    getSPLColorRGB(spl) {
        // Smooth gradient color mapping with proper interpolation
        spl = Math.max(0, Math.min(120, spl)); // Clamp SPL values
        
        // Define color stops with SPL values
        const colorStops = [
            { spl: 120, r: 255, g: 0, b: 0 },     // Bright red
            { spl: 110, r: 255, g: 50, b: 0 },    // Red-orange
            { spl: 100, r: 255, g: 150, b: 0 },   // Orange
            { spl: 90, r: 255, g: 255, b: 0 },    // Yellow
            { spl: 80, r: 150, g: 255, b: 0 },    // Yellow-green
            { spl: 70, r: 0, g: 255, b: 100 },    // Green
            { spl: 60, r: 0, g: 200, b: 255 },    // Cyan
            { spl: 50, r: 0, g: 100, b: 255 },    // Blue
            { spl: 40, r: 50, g: 50, b: 255 },    // Deep blue
            { spl: 0, r: 0, g: 0, b: 150 }        // Dark blue
        ];
        
        // Find the two color stops to interpolate between
        for (let i = 0; i < colorStops.length - 1; i++) {
            const upper = colorStops[i];
            const lower = colorStops[i + 1];
            
            if (spl >= lower.spl) {
                // Interpolate between upper and lower
                const range = upper.spl - lower.spl;
                const factor = range > 0 ? (spl - lower.spl) / range : 0;
                
                return {
                    r: Math.round(lower.r + (upper.r - lower.r) * factor),
                    g: Math.round(lower.g + (upper.g - lower.g) * factor),
                    b: Math.round(lower.b + (upper.b - lower.b) * factor)
                };
            }
        }
        
        // Fallback to darkest color
        return { r: 0, g: 0, b: 150 };
    }
    
    drawTopView(params, listeningHeight) {
        console.log('Drawing top view with listening height:', listeningHeight);
        const ctx = this.mainCtx;
        const canvas = this.mainCanvas;
        const { roomWidth, roomDepth, maxSPL } = params;
        
        // Clear canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create gradient background
        const bgGradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, 0,
            canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height)/2
        );
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#0f0f1a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const scaleX = canvas.width / roomWidth;
        const scaleY = canvas.height / roomDepth;
        const scale = Math.min(scaleX, scaleY) * 0.85;
        
        const offsetX = (canvas.width - roomWidth * scale) / 2;
        const offsetY = (canvas.height - roomDepth * scale) / 2;
        
        // Get speaker position and direction
        const speaker = this.getSpeakerPosition(params);
        const direction = this.getSpeakerDirection(params);
        
        // Create smooth SPL heatmap using ImageData for better performance
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;
        
        console.log('Starting smooth heatmap drawing...');
        
        for (let canvasX = 0; canvasX < canvas.width; canvasX += 2) {
            for (let canvasY = 0; canvasY < canvas.height; canvasY += 2) {
                // Convert canvas coordinates to room coordinates
                const roomX = (canvasX - offsetX) / scale;
                const roomY = (canvasY - offsetY) / scale;
                
                // Check if point is within room bounds
                if (roomX >= 0 && roomX <= roomWidth && roomY >= 0 && roomY <= roomDepth) {
                    const dx = roomX - speaker.x;
                    const dy = roomY - speaker.y;
                    const dz = listeningHeight - speaker.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    if (distance > 0.1) {
                        // Calculate angles
                        const pointDirection = { x: dx / distance, y: dy / distance };
                        const horizDotProduct = Math.max(-1, Math.min(1, direction.x * pointDirection.x + direction.y * pointDirection.y));
                        const horizontalAngle = Math.acos(horizDotProduct) * 180 / Math.PI;
                        const verticalAngle = Math.atan2(dz, Math.sqrt(dx * dx + dy * dy)) * 180 / Math.PI;
                        
                        const spl = this.calculateSPL(distance, horizontalAngle, verticalAngle, maxSPL);
                        const color = this.getSPLColorRGB(spl);
                        
                        // Apply smooth gradient effect with better alpha blending
                        const alpha = Math.max(0.4, Math.min(0.9, (spl - 30) / (maxSPL - 30)));
                        
                        // Add subtle noise for more natural appearance
                        const noise = (Math.random() - 0.5) * 0.1;
                        const finalAlpha = Math.max(0.2, Math.min(1.0, alpha + noise));
                        
                        // Fill 2x2 pixel area for smoother appearance
                        for (let px = 0; px < 2 && canvasX + px < canvas.width; px++) {
                            for (let py = 0; py < 2 && canvasY + py < canvas.height; py++) {
                                const index = ((canvasY + py) * canvas.width + (canvasX + px)) * 4;
                                if (index < data.length - 3) {
                                    data[index] = color.r;     // Red
                                    data[index + 1] = color.g; // Green
                                    data[index + 2] = color.b; // Blue
                                    data[index + 3] = finalAlpha * 255; // Alpha
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Apply the smooth heatmap
        ctx.putImageData(imageData, 0, 0);
        
        // Add subtle room outline with glow effect
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, roomWidth * scale, roomDepth * scale);
        ctx.shadowBlur = 0;
        
        // Draw enhanced dispersion pattern with gradients
        const speakerPixelX = offsetX + speaker.x * scale;
        const speakerPixelY = offsetY + speaker.y * scale;
        const directionAngle = Math.atan2(direction.y, direction.x);
        const coneLength = 150;
        
        // Create gradient for dispersion cone
        const coneGradient = ctx.createRadialGradient(
            speakerPixelX, speakerPixelY, 0,
            speakerPixelX, speakerPixelY, coneLength
        );
        coneGradient.addColorStop(0, 'rgba(255, 255, 0, 0.4)');
        coneGradient.addColorStop(1, 'rgba(255, 255, 0, 0.1)');
        
        // Draw filled dispersion cone
        const leftAngle = directionAngle - Math.PI / 4;
        const rightAngle = directionAngle + Math.PI / 4;
        
        ctx.fillStyle = coneGradient;
        ctx.beginPath();
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(leftAngle) * coneLength,
            speakerPixelY + Math.sin(leftAngle) * coneLength
        );
        ctx.arc(speakerPixelX, speakerPixelY, coneLength, leftAngle, rightAngle);
        ctx.lineTo(speakerPixelX, speakerPixelY);
        ctx.fill();
        
        // Draw dispersion cone outline
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(leftAngle) * coneLength,
            speakerPixelY + Math.sin(leftAngle) * coneLength
        );
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(rightAngle) * coneLength,
            speakerPixelY + Math.sin(rightAngle) * coneLength
        );
        ctx.stroke();
        
        // Draw center axis with dashed line
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(directionAngle) * coneLength,
            speakerPixelY + Math.sin(directionAngle) * coneLength
        );
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw enhanced speaker with glow effect
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(speakerPixelX, speakerPixelY, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // Inner speaker circle
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(speakerPixelX, speakerPixelY, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Speaker orientation arrow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(speakerPixelX, speakerPixelY);
        const arrowEndX = speakerPixelX + Math.cos(directionAngle) * 25;
        const arrowEndY = speakerPixelY + Math.sin(directionAngle) * 25;
        ctx.lineTo(arrowEndX, arrowEndY);
        
        // Arrow head
        const arrowHeadLength = 8;
        const arrowHeadAngle = Math.PI / 6;
        ctx.lineTo(
            arrowEndX - arrowHeadLength * Math.cos(directionAngle - arrowHeadAngle),
            arrowEndY - arrowHeadLength * Math.sin(directionAngle - arrowHeadAngle)
        );
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
            arrowEndX - arrowHeadLength * Math.cos(directionAngle + arrowHeadAngle),
            arrowEndY - arrowHeadLength * Math.sin(directionAngle + arrowHeadAngle)
        );
        ctx.stroke();
        
        // Enhanced listening height indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`🎧 Listening Height: ${listeningHeight}m`, 20, 35);
        
        // Add room dimensions
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.fillText(`Room: ${roomWidth}m × ${roomDepth}m`, 20, canvas.height - 20);
        
        console.log('Enhanced top view drawing completed');
    }
    
    drawSideView(params) {
        console.log('Drawing enhanced side view with vertical tilt rendering');
        const ctx = this.mainCtx;
        const canvas = this.mainCanvas;
        const { roomDepth, roomHeight, maxSPL } = params;
        
        // Clear canvas and create gradient background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(1, '#0f0f1a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const scaleX = canvas.width / roomDepth;
        const scaleY = canvas.height / roomHeight;
        const scale = Math.min(scaleX, scaleY) * 0.8;
        
        const offsetX = (canvas.width - roomDepth * scale) / 2;
        const offsetY = (canvas.height - roomHeight * scale) / 2;
        
        // Get speaker position and direction
        const speaker = this.getSpeakerPosition(params);
        const direction = this.getSpeakerDirection(params);
        
        // Create smooth SPL heatmap using ImageData
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let canvasX = 0; canvasX < canvas.width; canvasX += 2) {
            for (let canvasY = 0; canvasY < canvas.height; canvasY += 2) {
                // Convert canvas coordinates to room coordinates
                const roomY = (canvasX - offsetX) / scale;
                const roomZ = roomHeight - (canvasY - offsetY) / scale;
                
                // Check if point is within room bounds
                if (roomY >= 0 && roomY <= roomDepth && roomZ >= 0 && roomZ <= roomHeight) {
                    const dx = 0;
                    const dy = roomY - speaker.y;
                    const dz = roomZ - speaker.z;
                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    
                    if (distance > 0.1) {
                        // Calculate horizontal angle (should be minimal in side view)
                        const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
                        let horizontalAngle = 0;
                        if (horizontalDistance > 0.01) {
                            horizontalAngle = Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;
                        }
                        
                        // Calculate vertical angle relative to speaker's tilted direction
                        const actualVerticalAngle = Math.atan2(dz, Math.max(horizontalDistance, 0.01)) * 180 / Math.PI;
                        const speakerVerticalAngle = params.verticalTilt; // Speaker's tilt angle
                        const relativeVerticalAngle = Math.abs(actualVerticalAngle - speakerVerticalAngle);
                        
                        const spl = this.calculateSPL(distance, horizontalAngle, relativeVerticalAngle, maxSPL);
                        const color = this.getSPLColorRGB(spl);
                        
                        // Better alpha calculation for side view
                        const alpha = Math.max(0.4, Math.min(0.9, (spl - 30) / (maxSPL - 30)));
                        const noise = (Math.random() - 0.5) * 0.08;
                        const finalAlpha = Math.max(0.2, Math.min(1.0, alpha + noise));
                        
                        // Fill 2x2 pixel area
                        for (let px = 0; px < 2 && canvasX + px < canvas.width; px++) {
                            for (let py = 0; py < 2 && canvasY + py < canvas.height; py++) {
                                const index = ((canvasY + py) * canvas.width + (canvasX + px)) * 4;
                                if (index < data.length - 3) {
                                    data[index] = color.r;
                                    data[index + 1] = color.g;
                                    data[index + 2] = color.b;
                                    data[index + 3] = finalAlpha * 255;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Draw room outline with glow
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, roomDepth * scale, roomHeight * scale);
        ctx.shadowBlur = 0;
        
        // Draw enhanced listening height indicators
        ctx.strokeStyle = '#00ff80';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        
        if (roomHeight >= 1.2) {
            const height12Y = offsetY + (roomHeight - 1.2) * scale;
            ctx.beginPath();
            ctx.moveTo(offsetX, height12Y);
            ctx.lineTo(offsetX + roomDepth * scale, height12Y);
            ctx.stroke();
        }
        
        if (roomHeight >= 1.7) {
            const height17Y = offsetY + (roomHeight - 1.7) * scale;
            ctx.beginPath();
            ctx.moveTo(offsetX, height17Y);
            ctx.lineTo(offsetX + roomDepth * scale, height17Y);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        // Draw vertical dispersion pattern with proper tilt rendering
        const speakerPixelX = offsetX + speaker.y * scale;
        const speakerPixelY = offsetY + (roomHeight - speaker.z) * scale;
        
        // Calculate proper vertical direction with tilt
        const verticalTiltRad = (params.verticalTilt * Math.PI) / 180;
        
        // Base direction for side view (horizontal forward)
        const baseVerticalDirection = 0; // 0 radians = horizontal forward
        
        // Apply vertical tilt - positive tilt aims upward, negative downward
        const adjustedVerticalDirection = baseVerticalDirection + verticalTiltRad;
        
        const coneLength = 120;
        const dispersionAngle = Math.PI / 8; // 22.5° vertical dispersion
        const topAngle = adjustedVerticalDirection + dispersionAngle;
        const bottomAngle = adjustedVerticalDirection - dispersionAngle;
        
        // Create gradient for vertical dispersion with tilt-aware coloring
        const vertConeGradient = ctx.createRadialGradient(
            speakerPixelX, speakerPixelY, 0,
            speakerPixelX, speakerPixelY, coneLength
        );
        
        // Color intensity based on tilt direction
        const tiltIntensity = Math.abs(params.verticalTilt) / 45; // Normalize to 0-1 for ±45°
        const baseAlpha = 0.3 + (tiltIntensity * 0.2); // More visible with higher tilt
        
        vertConeGradient.addColorStop(0, `rgba(255, 255, 0, ${baseAlpha + 0.1})`);
        vertConeGradient.addColorStop(0.7, `rgba(255, 255, 0, ${baseAlpha})`);
        vertConeGradient.addColorStop(1, `rgba(255, 255, 0, 0.05)`);
        
        // Draw filled vertical dispersion cone
        ctx.fillStyle = vertConeGradient;
        ctx.beginPath();
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(topAngle) * coneLength,
            speakerPixelY - Math.sin(topAngle) * coneLength
        );
        ctx.lineTo(
            speakerPixelX + Math.cos(bottomAngle) * coneLength,
            speakerPixelY - Math.sin(bottomAngle) * coneLength
        );
        ctx.closePath();
        ctx.fill();
        
        // Draw dispersion outline with tilt-aware styling
        ctx.strokeStyle = params.verticalTilt === 0 ? '#ffff00' : '#ff8800'; // Change color when tilted
        ctx.lineWidth = 2 + Math.abs(params.verticalTilt) / 30; // Thicker line with more tilt
        ctx.beginPath();
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(topAngle) * coneLength,
            speakerPixelY - Math.sin(topAngle) * coneLength
        );
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(bottomAngle) * coneLength,
            speakerPixelY - Math.sin(bottomAngle) * coneLength
        );
        ctx.stroke();
        
        // Draw center axis with enhanced tilt visualization
        const centerAxisColor = params.verticalTilt > 0 ? '#ff4400' : 
                               params.verticalTilt < 0 ? '#0088ff' : '#ff8800';
        ctx.strokeStyle = centerAxisColor; // Red for up-tilt, blue for down-tilt, orange for center
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(speakerPixelX, speakerPixelY);
        ctx.lineTo(
            speakerPixelX + Math.cos(adjustedVerticalDirection) * coneLength,
            speakerPixelY - Math.sin(adjustedVerticalDirection) * coneLength
        );
        ctx.stroke();
        
        // Add tilt direction arrow
        if (Math.abs(params.verticalTilt) > 2) { // Show arrow for significant tilts
            const arrowSize = 12;
            const arrowX = speakerPixelX + Math.cos(adjustedVerticalDirection) * (coneLength * 0.8);
            const arrowY = speakerPixelY - Math.sin(adjustedVerticalDirection) * (coneLength * 0.8);
            
            ctx.setLineDash([]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            // Arrow head pointing in tilt direction
            const perpAngle1 = adjustedVerticalDirection + Math.PI * 0.8;
            const perpAngle2 = adjustedVerticalDirection - Math.PI * 0.8;
            
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX + Math.cos(perpAngle1) * arrowSize, arrowY - Math.sin(perpAngle1) * arrowSize);
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX + Math.cos(perpAngle2) * arrowSize, arrowY - Math.sin(perpAngle2) * arrowSize);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        // Draw enhanced speaker
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(speakerPixelX, speakerPixelY, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(speakerPixelX, speakerPixelY, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Enhanced labels with tilt information
        ctx.fillStyle = 'rgba(0, 255, 128, 0.9)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        
        if (roomHeight >= 1.7) {
            const height17Y = offsetY + (roomHeight - 1.7) * scale;
            ctx.fillText('🧍 1.7m (Standing)', offsetX + roomDepth * scale + 15, height17Y + 5);
        }
        if (roomHeight >= 1.2) {
            const height12Y = offsetY + (roomHeight - 1.2) * scale;
            ctx.fillText('🪑 1.2m (Seated)', offsetX + roomDepth * scale + 15, height12Y + 5);
        }
        
        // Add tilt direction indicator
        if (Math.abs(params.verticalTilt) > 0) {
            const tiltDirection = params.verticalTilt > 0 ? '↗️ Tilted UP' : '↘️ Tilted DOWN';
            const tiltColor = params.verticalTilt > 0 ? 'rgba(255, 68, 0, 0.9)' : 'rgba(0, 136, 255, 0.9)';
            ctx.fillStyle = tiltColor;
            ctx.font = 'bold 16px Arial';
            ctx.fillText(tiltDirection, offsetX + roomDepth * scale + 15, offsetY + 30);
        }
        
        // Add room dimensions and speaker info
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('📐 Side View Analysis', 20, 35);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.fillText(`Room: ${roomDepth}m × ${roomHeight}m`, 20, canvas.height - 40);
        ctx.fillText(`Speaker Height: ${(speaker.z).toFixed(1)}m | Tilt: ${params.verticalTilt}°`, 20, canvas.height - 20);
        
        console.log('Enhanced side view drawing completed');
    }
    
    updateSimulation() {
        console.log('Updating simulation...');
        const params = this.getParameters();
        const viewTitle = document.getElementById('viewTitle');
        
        if (!viewTitle) {
            console.error('View title element not found');
            return;
        }
        
        console.log('View mode:', params.viewMode);
        
        try {
            if (params.viewMode === 'top_1.2') {
                viewTitle.textContent = 'Top View (1.2m Listening Height)';
                this.drawTopView(params, 1.2);
            } else if (params.viewMode === 'top_1.7') {
                viewTitle.textContent = 'Top View (1.7m Listening Height)';
                this.drawTopView(params, 1.7);
            } else if (params.viewMode === 'side') {
                viewTitle.textContent = 'Side View (45° Vertical Dispersion)';
                this.drawSideView(params);
            } else {
                console.log('Using default view mode');
                viewTitle.textContent = 'Top View (1.2m Listening Height)';
                this.drawTopView(params, 1.2);
            }
        } catch (error) {
            console.error('Error in updateSimulation:', error);
        }
    }
}

// Initialize the simulator when the page loads
window.addEventListener('load', () => {
    console.log('Page loaded, initializing SPLSimulator...');
    try {
        new SPLSimulator();
    } catch (error) {
        console.error('Error initializing SPLSimulator:', error);
    }
});
