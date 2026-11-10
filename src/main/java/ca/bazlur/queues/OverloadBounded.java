package ca.bazlur.queues;

import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static java.util.concurrent.TimeUnit.MILLISECONDS;

public class OverloadBounded {

    private static final int DEADLINE_MILLIS = 500;

    private final Semaphore connections = new Semaphore(8);
    private final Semaphore admission = new Semaphore(32);
    private volatile int queryMillis = 20;

    private final AtomicInteger inFlight = new AtomicInteger();
    private final AtomicLong slowest = new AtomicLong();
    private final AtomicInteger onTime = new AtomicInteger();
    private final AtomicInteger late = new AtomicInteger();
    private final AtomicInteger rejected = new AtomicInteger();

    void main() throws InterruptedException {
        try (var requests = Executors.newVirtualThreadPerTaskExecutor();
             var traffic = Executors.newSingleThreadScheduledExecutor()) {

            // 200 requests a second
            traffic.scheduleAtFixedRate(() -> requests.submit(this::handle), 0, 5, MILLISECONDS);

            for (int second = 1; second <= 9; second++) {
                queryMillis = second >= 3 && second <= 5 ? 80 : 20;
                Thread.sleep(1000);
                IO.println("%ds   db %d ms   in flight %3d   slowest %4d ms   rejected %3d"
                        .formatted(second, queryMillis, inFlight.get(), slowest.getAndSet(0), rejected.get()));
            }
        }
        IO.println("answered within %d ms: %d, late: %d, rejected: %d"
                .formatted(DEADLINE_MILLIS, onTime.get(), late.get(), rejected.get()));
    }

    private void handle() {
        if (!admission.tryAcquire()) {
            rejected.incrementAndGet();
            return;
        }
        long start = System.nanoTime();
        inFlight.incrementAndGet();
        try {
            reserve();
            record(start);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            inFlight.decrementAndGet();
            admission.release();
        }
    }

    private void reserve() throws InterruptedException {
        connections.acquire();
        try {
            Thread.sleep(queryMillis);
        } finally {
            connections.release();
        }
    }

    private void record(long start) {
        long millis = (System.nanoTime() - start) / 1_000_000;
        slowest.accumulateAndGet(millis, Math::max);
        if (millis <= DEADLINE_MILLIS) {
            onTime.incrementAndGet();
        } else {
            late.incrementAndGet();
        }
    }
}
