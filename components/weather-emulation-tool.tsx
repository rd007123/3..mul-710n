"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import GUI from "lil-gui"

const WeatherEmulationTool: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const guiRef = useRef<GUI | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const currentMount = mountRef.current

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000)
    camera.position.set(10, 10, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    currentMount.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 10, 7.5)
    scene.add(directionalLight)

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50)
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    // --- Weather Effects ---
    const params = {
      // Rain
      rain: true,
      rainIntensity: 5000,
      rainSpeed: 5,
      rainColor: 0xaaaaee,
      // Snow
      snow: false, // Initially off
      snowIntensity: 2000,
      snowSpeed: 0.5, // Slower than rain
      flakeSize: 0.15,
      snowColor: 0xffffff,
      // Fog
      fog: true,
      fogDensity: 0.02,
      fogColor: 0xcccccc,
      // Wind
      windStrengthX: 0.5,
      windStrengthZ: 0.2,
    }

    // --- Rain System ---
    let rainParticles: THREE.Points | null = null
    let rainGeometry: THREE.BufferGeometry | null = null
    let rainMaterial: THREE.PointsMaterial | null = null
    const rainVertices: number[] = []

    function createRain() {
      if (rainParticles) scene.remove(rainParticles)
      if (rainGeometry) rainGeometry.dispose()
      if (rainMaterial) rainMaterial.dispose()

      rainGeometry = new THREE.BufferGeometry()
      rainMaterial = new THREE.PointsMaterial({
        color: params.rainColor,
        size: 0.1,
        transparent: true,
        opacity: 0.7,
      })

      rainVertices.length = 0 // Clear previous vertices
      for (let i = 0; i < params.rainIntensity; i++) {
        const x = Math.random() * 50 - 25
        const y = Math.random() * 30 + 5 // Start above ground
        const z = Math.random() * 50 - 25
        rainVertices.push(x, y, z)
      }
      rainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rainVertices, 3))
      rainParticles = new THREE.Points(rainGeometry, rainMaterial)
      scene.add(rainParticles)
    }

    function updateRain() {
      if (!rainParticles || !rainGeometry || !params.rain) {
        if (rainParticles) rainParticles.visible = false
        return
      }
      if (rainParticles) rainParticles.visible = true

      const positions = rainGeometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= params.rainSpeed * 0.1 // Y position (fall)
        positions[i] += params.windStrengthX * 0.05 // X wind influence
        positions[i + 2] += params.windStrengthZ * 0.05 // Z wind influence

        // Reset particle if it falls below ground or goes too far
        if (positions[i + 1] < 0) {
          positions[i + 1] = Math.random() * 30 + 10 // Reset Y
          positions[i] = Math.random() * 50 - 25 // Reset X
          positions[i + 2] = Math.random() * 50 - 25 // Reset Z
        }
        // Basic boundary reset for wind
        if (positions[i] > 25 || positions[i] < -25 || positions[i + 2] > 25 || positions[i + 2] < -25) {
          positions[i + 1] = Math.random() * 30 + 10
          positions[i] = Math.random() * 50 - 25
          positions[i + 2] = Math.random() * 50 - 25
        }
      }
      rainGeometry.attributes.position.needsUpdate = true
    }

    // --- Snow System ---
    let snowParticles: THREE.Points | null = null
    let snowGeometry: THREE.BufferGeometry | null = null
    let snowMaterial: THREE.PointsMaterial | null = null
    const snowVertices: number[] = []

    function createSnow() {
      if (snowParticles) scene.remove(snowParticles)
      if (snowGeometry) snowGeometry.dispose()
      if (snowMaterial) snowMaterial.dispose()

      snowGeometry = new THREE.BufferGeometry()
      snowMaterial = new THREE.PointsMaterial({
        color: params.snowColor,
        size: params.flakeSize,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending, // Makes flakes brighter
        sizeAttenuation: true,
      })

      snowVertices.length = 0
      for (let i = 0; i < params.snowIntensity; i++) {
        const x = Math.random() * 50 - 25
        const y = Math.random() * 30 + 5
        const z = Math.random() * 50 - 25
        snowVertices.push(x, y, z)
      }
      snowGeometry.setAttribute("position", new THREE.Float32BufferAttribute(snowVertices, 3))
      snowParticles = new THREE.Points(snowGeometry, snowMaterial)
      scene.add(snowParticles)
    }

    function updateSnow() {
      if (!snowParticles || !snowGeometry || !params.snow) {
        if (snowParticles) snowParticles.visible = false
        return
      }
      if (snowParticles) snowParticles.visible = true

      const positions = snowGeometry.attributes.position.array as Float32Array
      const time = Date.now() * 0.0002 // For subtle flutter

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= params.snowSpeed * 0.1 // Y position (fall)

        // Wind influence (slightly more drift for snow)
        positions[i] += params.windStrengthX * 0.07 + Math.sin(time + positions[i + 2] * 0.5) * 0.02 // X wind + flutter
        positions[i + 2] += params.windStrengthZ * 0.07 + Math.cos(time + positions[i] * 0.5) * 0.02 // Z wind + flutter

        if (positions[i + 1] < 0) {
          positions[i + 1] = Math.random() * 30 + 10
          positions[i] = Math.random() * 50 - 25
          positions[i + 2] = Math.random() * 50 - 25
        }
        if (positions[i] > 25 || positions[i] < -25 || positions[i + 2] > 25 || positions[i + 2] < -25) {
          positions[i + 1] = Math.random() * 30 + 10
          positions[i] = Math.random() * 50 - 25
          positions[i + 2] = Math.random() * 50 - 25
        }
      }
      snowGeometry.attributes.position.needsUpdate = true
    }

    if (params.rain) createRain()
    if (params.snow) createSnow()

    // Fog System
    function updateFog() {
      if (params.fog) {
        if (!scene.fog) {
          scene.fog = new THREE.FogExp2(params.fogColor, params.fogDensity)
        } else {
          ;(scene.fog as THREE.FogExp2).color.setHex(params.fogColor)
          ;(scene.fog as THREE.FogExp2).density = params.fogDensity
        }
      } else {
        scene.fog = null
      }
    }
    updateFog()

    // GUI
    if (guiRef.current) {
      guiRef.current.destroy()
    }
    const gui = new GUI()
    guiRef.current = gui

    const rainFolder = gui.addFolder("Rain")
    rainFolder
      .add(params, "rain")
      .name("Enable Rain")
      .onChange((value: boolean) => {
        if (value && !rainParticles) createRain()
        else if (rainParticles) rainParticles.visible = value
      })
    rainFolder.add(params, "rainIntensity", 100, 20000, 100).name("Intensity").onFinishChange(createRain)
    rainFolder.add(params, "rainSpeed", 0.1, 20, 0.1).name("Speed")
    rainFolder
      .addColor(params, "rainColor")
      .name("Color")
      .onChange((value: number) => {
        if (rainMaterial) rainMaterial.color.setHex(value)
      })

    const fogFolder = gui.addFolder("Fog")
    fogFolder.add(params, "fog").name("Enable Fog").onChange(updateFog)
    fogFolder.add(params, "fogDensity", 0, 0.2, 0.001).name("Density").onChange(updateFog)
    fogFolder.addColor(params, "fogColor").name("Color").onChange(updateFog)

    const snowFolder = gui.addFolder("Snow")
    snowFolder
      .add(params, "snow")
      .name("Enable Snow")
      .onChange((value: boolean) => {
        if (value && !snowParticles) createSnow()
        else if (snowParticles) snowParticles.visible = value
      })
    snowFolder.add(params, "snowIntensity", 100, 20000, 100).name("Intensity").onFinishChange(createSnow)
    snowFolder.add(params, "snowSpeed", 0.1, 5, 0.05).name("Speed")
    snowFolder
      .add(params, "flakeSize", 0.01, 0.5, 0.01)
      .name("Flake Size")
      .onChange(() => {
        if (snowMaterial) snowMaterial.size = params.flakeSize
      })
    snowFolder
      .addColor(params, "snowColor")
      .name("Color")
      .onChange((value: number) => {
        if (snowMaterial) snowMaterial.color.setHex(value)
      })

    const windFolder = gui.addFolder("Wind")
    windFolder.add(params, "windStrengthX", -5, 5, 0.1).name("Strength X")
    windFolder.add(params, "windStrengthZ", -5, 5, 0.1).name("Strength Z")

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      if (params.rain) updateRain()
      if (params.snow) updateSnow()
      // No explicit updateFog needed in loop, changes are event-driven
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement)
      }
      renderer.dispose()
      if (rainGeometry) rainGeometry.dispose()
      if (rainMaterial) rainMaterial.dispose()

      if (snowGeometry) snowGeometry.dispose()
      if (snowMaterial) snowMaterial.dispose()

      if (guiRef.current) {
        guiRef.current.destroy()
        guiRef.current = null
      }
      // Clean up scene children more thoroughly if needed
      while (scene.children.length > 0) {
        const object = scene.children[0]
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose())
            } else {
              object.material.dispose()
            }
          }
        }
        scene.remove(object)
      }
    }
  }, [])

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
}

export default WeatherEmulationTool
