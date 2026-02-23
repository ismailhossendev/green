import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hrmAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FiCamera, FiMapPin, FiClock, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import './Attendance.css';

const Attendance = () => {
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [photo, setPhoto] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [attendanceType, setAttendanceType] = useState('check-in');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const queryClient = useQueryClient();

    // Get current location
    const getLocation = () => {
        setLocationError('');
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by this browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                toast.success('Location captured successfully!');
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('User denied the request for Geolocation.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location information is unavailable.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('The request to get user location timed out.');
                        break;
                    default:
                        setLocationError('An unknown error occurred.');
                        break;
                }
                toast.error(locationError || 'Failed to get location');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Start camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setCameraActive(true);
        } catch (err) {
            toast.error('Failed to access camera. Please allow camera permission.');
            console.error('Camera error:', err);
        }
    };

    // Capture photo
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        stopCamera();
        toast.success('Photo captured!');
    };

    // Stop camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    // Retake photo
    const retakePhoto = () => {
        setPhoto(null);
        startCamera();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopCamera();
    }, []);

    // Submit attendance
    const attendanceMutation = useMutation({
        mutationFn: (data) => hrmAPI.markAttendance(data),
        onSuccess: () => {
            toast.success(`${attendanceType === 'check-in' ? 'Check-in' : 'Check-out'} successful!`);
            queryClient.invalidateQueries(['attendance']);
            setPhoto(null);
            setLocation(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to mark attendance');
        }
    });

    const handleSubmit = () => {
        if (!location) {
            toast.error('Please capture your location first');
            return;
        }
        if (!photo) {
            toast.error('Please capture your photo first');
            return;
        }

        attendanceMutation.mutate({
            type: attendanceType,
            location: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
            },
            photo: photo,
            timestamp: new Date().toISOString()
        });
    };

    return (
        <div className="attendance-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance</h1>
                    <p className="page-subtitle">Mark your daily attendance with GPS & Photo</p>
                </div>
            </div>

            <div className="attendance-grid">
                {/* Attendance Type Selection */}
                <div className="card attendance-type-card">
                    <h3 className="card-title">Attendance Type</h3>
                    <div className="attendance-type-buttons">
                        <button
                            className={`attendance-type-btn ${attendanceType === 'check-in' ? 'active check-in' : ''}`}
                            onClick={() => setAttendanceType('check-in')}
                        >
                            <FiClock />
                            Check In
                        </button>
                        <button
                            className={`attendance-type-btn ${attendanceType === 'check-out' ? 'active check-out' : ''}`}
                            onClick={() => setAttendanceType('check-out')}
                        >
                            <FiClock />
                            Check Out
                        </button>
                    </div>
                </div>

                {/* Location Capture */}
                <div className="card">
                    <h3 className="card-title">
                        <FiMapPin /> Location
                    </h3>

                    {location ? (
                        <div className="location-captured">
                            <div className="location-info">
                                <div className="location-coord">
                                    <span>Latitude:</span> {location.latitude.toFixed(6)}
                                </div>
                                <div className="location-coord">
                                    <span>Longitude:</span> {location.longitude.toFixed(6)}
                                </div>
                                <div className="location-coord">
                                    <span>Accuracy:</span> ±{location.accuracy.toFixed(0)}m
                                </div>
                            </div>
                            <button className="btn btn-secondary" onClick={getLocation}>
                                <FiRefreshCw /> Refresh
                            </button>
                        </div>
                    ) : (
                        <div className="location-capture">
                            {locationError && (
                                <div className="location-error">{locationError}</div>
                            )}
                            <button className="btn btn-primary btn-lg" onClick={getLocation}>
                                <FiMapPin /> Capture Location
                            </button>
                        </div>
                    )}
                </div>

                {/* Photo Capture */}
                <div className="card">
                    <h3 className="card-title">
                        <FiCamera /> Photo
                    </h3>

                    <div className="photo-capture">
                        {photo ? (
                            <div className="photo-preview">
                                <img src={photo} alt="Attendance Photo" />
                                <button className="btn btn-secondary" onClick={retakePhoto}>
                                    <FiRefreshCw /> Retake
                                </button>
                            </div>
                        ) : cameraActive ? (
                            <div className="camera-view">
                                <video ref={videoRef} autoPlay playsInline muted />
                                <div className="camera-controls">
                                    <button className="btn btn-danger" onClick={stopCamera}>
                                        <FiX /> Cancel
                                    </button>
                                    <button className="btn btn-primary btn-capture" onClick={capturePhoto}>
                                        <FiCamera />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="camera-placeholder">
                                <button className="btn btn-primary btn-lg" onClick={startCamera}>
                                    <FiCamera /> Open Camera
                                </button>
                            </div>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                </div>

                {/* Submit */}
                <div className="card attendance-submit-card">
                    <div className="attendance-summary">
                        <div className="summary-item">
                            <FiMapPin className={location ? 'captured' : ''} />
                            <span>Location {location ? '✓' : '○'}</span>
                        </div>
                        <div className="summary-item">
                            <FiCamera className={photo ? 'captured' : ''} />
                            <span>Photo {photo ? '✓' : '○'}</span>
                        </div>
                        <div className="summary-item">
                            <FiClock />
                            <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>

                    <button
                        className={`btn btn-lg ${attendanceType === 'check-in' ? 'btn-success' : 'btn-warning'} btn-submit-attendance`}
                        onClick={handleSubmit}
                        disabled={!location || !photo || attendanceMutation.isPending}
                    >
                        {attendanceMutation.isPending ? (
                            <>
                                <span className="spinner"></span>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <FiCheck /> Submit {attendanceType === 'check-in' ? 'Check In' : 'Check Out'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
